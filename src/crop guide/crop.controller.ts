import { Controller, Get, Req, Res, Query, Post, Param, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { CropService } from './crop.service';

@Controller('crop')
export class CropController {
  constructor(private readonly cropService: CropService) {}

@Get()
async getCrops(
  @Query('id') id?: string,
  @Query('cropName') cropName?: string,
) {
  return await this.cropService.getCrops({
    id,          // UUID string
    cropName,
  });
}


  
  @Get('names')
  async getCropNames(
    @Query('state') state?: string,
  ) {
    return await this.cropService.getCropName({
      state,
    });
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './public/images/crops',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `crop-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
  }))
  async uploadCropImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    const imagePath = `image/crops/${file.filename}`;
    return this.cropService.updateCropImage(id, imagePath);
  }
}
