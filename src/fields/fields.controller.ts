import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { GetFieldsDataDto } from './dto/get-fields-data.dto';

@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Post()
  createField(@Body() createFieldDto: CreateFieldDto, @Req() req: any) {
    const userId = req.user.id;
    if (createFieldDto.sowing_date) {
      createFieldDto.sowing_date = new Date(createFieldDto.sowing_date);
    }
    if (createFieldDto.harvest_date) {
      createFieldDto.harvest_date = new Date(createFieldDto.harvest_date);
    }
    return this.fieldsService.createField(createFieldDto, userId);
  }

  @Get()
  getAll(@Req() req: any) {
    const userId = req.user.id;
    return this.fieldsService.getAll(userId);
  }

  @Post('data')
  async getFieldsData(@Body() body: GetFieldsDataDto) {
    return await this.fieldsService.getFieldsData(
      body.columns,
      body.page,
      body.limit,
      body.sortBy,
      body.sortOrder,
      body.columnSearch,
    );
  }

  @Get('farm_score')
  async getFarmScoreData(@Req() req: any) {
    const state: string = req.query.state;
    const district: string = req.query.district;
    const userId = req.user.id;
    const parameters: string = req.query.parameters;

    return await this.fieldsService.getFarmScoreData(state, district, userId, parameters);
  }

  @Get('heatmap')
  async findHeatmap(
    @Query('fieldId') fieldId: string,
    @Query('layer') layer: string,
    @Query('width') width: string,
    @Query('height') height: string,
    @Query('toDate') toDate: string,
    @Query('days') days: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const options = {
      layer: layer || 'ndvi',
      width: parseInt(width) || 512,
      height: parseInt(height) || 512,
      toDate: toDate || new Date().toISOString(),
      days: Number(days || 90),
    };
    const result = await this.fieldsService.getHeatmap(
      fieldId,
      userId,
      options,
    );
    if (result.success) {
      res
        .status(200)
        .set({
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=3600',
          'Content-Disposition': 'inline; filename=heatmap.png',
        })
        .send(result.data.buffer);
    } else {
      res.status(result.statusCode || 500).json(result);
    }
  }

  @Get('/scenes')
  async getScenes(@Query() query: any, @Req() req: any) {
    const userId = req.user.id;
    return await this.fieldsService.getAvailableScenes(userId, query);
  }

  @Post('indices')
  async compute(@Req() req: any) {
    const { fieldId, from, to }: any = req.body;
    const userId = req.user.id;

    return await this.fieldsService.computeSoilFeatures(
      fieldId,
      userId,
      from,
      to,
    );
  }

  @Patch(':fieldId/select')
  async selectField(
    @Param('fieldId') fieldId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return await this.fieldsService.selectField(fieldId, userId);
  }

  @Patch(':fieldId')
  async update(
    @Param('fieldId') fieldId: string,
    @Body() updateFieldDto: UpdateFieldDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    updateFieldDto.sowing_date = updateFieldDto.sowing_date
      ? new Date(updateFieldDto.sowing_date)
      : undefined;
    updateFieldDto.harvest_date = updateFieldDto.harvest_date
      ? new Date(updateFieldDto.harvest_date)
      : undefined;
    return await this.fieldsService.update(
      fieldId,
      updateFieldDto,
      userId,
    );
  }

  @Delete(':fieldId')
  async remove(
    @Param('fieldId') fieldId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return await this.fieldsService.remove(fieldId, userId);
  }

  @Get(':fieldId')
  async getById(
    @Param('fieldId') fieldId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return await this.fieldsService.getById(userId, fieldId);
  }
  @Get('image/latest')
  async getLatest(@Query('fieldId') fieldId: string) {
    return this.fieldsService.getLatestImage(fieldId);
  }

  @Post('backfill/may-2025')
  async backfillMay(@Req() req: any) {
    const userId = req.user.id;
    return await this.fieldsService.backfillMay2025(userId);
  }

}
