import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Param,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { SoilService } from './soil.service';
import { FertilizerRecommendationResponseDto } from './dto/fertilizer-recommendation-response.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Field } from '../fields/models/field.model';
import { User } from '../auth/models/user.model';
import { Sequelize } from 'sequelize-typescript';

@Controller('soil')
export class SoilController {
  constructor(
    private readonly soilService: SoilService,
    @InjectModel(Field)
    private readonly fieldModel: typeof Field,
    @InjectModel(User)
    private readonly userModel: typeof User,
    private readonly sequelize: Sequelize,
  ) {}

  // ============================================================
  // COMMON HELPER — GET SELECTED FIELD (REMOVES REPETITION)
  // ============================================================
  private async getSelectedField(userId: string) {
    const field = await this.fieldModel.findOne({
      where: {
        user_id: userId,
        is_selected: true,
      },
      raw: true,
    });

    if (!field) {
      throw new BadRequestException('No selected field found');
    }

    return field;
  }

  private async getUserData(userId: string) {
    const userData = await this.userModel.findOne({
      where: {
        id: userId
      },
      raw: true,
    });

    if (!userData) {
      throw new BadRequestException('No user found');
    }

    return userData;
  }
  // ============================================================
  // ML-DRIVEN FERTILIZER RECOMMENDATION (STABLE)
  // ============================================================
  @Post('fertilizer-recommendation')
  async getFertilizerRecommendation(
    @Req() req: any,
  ): Promise<FertilizerRecommendationResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }

    const field = await this.getSelectedField(userId);
    const userData = await this.getUserData(userId);
    const result = await this.soilService.getSoilPredictionByFieldId(field.id);
    const fert = result.fertilizerRecommendation;

    return {
      farmer_name: userData.name || "",
      mobile_number: userData.phone_no || "",
      fieldId: result.field_id,
      crop: field.crop_name ?? null,
      state: field.state ?? null,
      district: field.district ?? null,
      village: field.village ?? null,
      pincode: field.pincode ?? null,
      lat: field.lat ?? null,
      lon: field.lon ?? null,
      nutrients: result.prediction.predictions,
      soilStatus: {
        nitrogen: fert.soilStatus.n,
        phosphorus: fert.soilStatus.p,
        potassium: fert.soilStatus.k,
      },
      fym: fert.fym?.toString() || "",
      combination_1: fert.combination_1 || [],
      combination_2: fert.combination_2 || [],

      updatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // FETCH STORED RECOMMENDATION
  // ============================================================
  @Get('recommendation/:id')
  async getSavedRecommendation(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('recommendation id is required');
    }

    try {
      return await this.soilService.getSavedRecommendation(id);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message || 'Failed to fetch saved recommendation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // SOIL TEMPERATURE + MOISTURE
  // ============================================================
  @Get('condition')
  async getSoilCondition(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }

    const field = await this.getSelectedField(userId);

    return this.soilService.getSoilConditionByField(field.id);
  }

  // ============================================================
  // SOIL OVERVIEW (ML + TEMP + MOISTURE + FORECAST)
  // ============================================================
  @Get('overview')
  async getSoilOverview(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User authentication required');
    }

    const field = await this.getSelectedField(userId);
    const userData = await this.getUserData(userId);
    const fieldId = field.id;

    const [mlResult, conditionResult] = await Promise.all([
      this.soilService.getSoilPredictionByFieldId(fieldId),
      this.soilService.getSoilConditionByField(fieldId),
    ]);

    return {
      field_id: fieldId,
      farmer_name: userData.name || "",
      mobile_number: userData.phone_no || "",
      crop: field.crop_name ?? null,
      state: field.state ?? null,
      district: field.district ?? null,
      village: field.village ?? null,
      pincode: field.pincode ?? null,
      lat: field.lat ?? null,
      lon: field.lon ?? null,

        prediction: {
      predictions: mlResult.prediction.predictions,
      stats: mlResult.prediction.stats,

      forecast7d: conditionResult.forecast_7d,

      soilLayers: conditionResult.temperature?.layers ?? [],
      moistureLayers: conditionResult.moisture?.layers ?? [],

      tempInsight: conditionResult.temperature?.advisory ?? null,
      moistInsight: conditionResult.moisture?.advisory ?? null,

      tempActions: conditionResult.temperature?.actions ?? [],
      moistActions: conditionResult.moisture?.actions ?? [],
    },

    fertilizerRecommendation: mlResult.fertilizerRecommendation,
    source: 'Soil Health Card Scheme – Govt. of India',
  };
}
  
}

