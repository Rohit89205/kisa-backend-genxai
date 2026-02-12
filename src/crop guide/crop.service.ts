import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CropSop } from './models/crop-sop.model';
import { Crop } from './models/crop.model';
import { ResponseHelper } from '../common/helper/response.helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CropService {
  constructor(
    @InjectModel(CropSop)
    private cropSopModel: typeof CropSop,
    @InjectModel(Crop)
    private cropModel: typeof Crop,
    private configService: ConfigService,
  ) {}

async getCrops(filters: { id?: string; cropName?: string }) {
  const data = await this.cropSopModel.findAll({
    where: {
      ...(filters.id && { id: filters.id }),
    },
    include: [
      {
        model: this.cropModel,
        required: true,
        attributes: ['crop_name', 'id', 'image'],
        where: {
          ...(filters.cropName && { crop_name: filters.cropName }),
        },
      },
    ],
    raw: true,
  });

  if (!data.length) {
    return ResponseHelper.error({
      message: 'No crop data found',
      statusCode: 404,
    });
  }

  const baseUrl =
    this.configService.get<string>('APP_BASE_URL') ||
    'http://localhost:4000/api/v1';

  const normalizedData = data.map((item) => {
    const result = {
      ...item,

      // 👇 flatten included Crop fields
      crop_name: item['crop.crop_name'],
      crop_id: item['crop.id'],
      image: item['crop.image']
        ? `${baseUrl}/${item['crop.image']}`
        : null,
    };

    // optional cleanup
    delete result['crop.crop_name'];
    delete result['crop.id'];
    delete result['crop.image'];

    return result;
  });

  return ResponseHelper.success({
    message: 'Crop data retrieved successfully',
    data: normalizedData,
  });
}


  

  
  async getCropName(filters: { state?: string }) {
    try {
      const data = await this.cropModel.findAll({
        attributes: ['crop_name', 'id'],
        where: {
          ...(filters.state && { state_name: filters.state }),
        },
        raw: true,
      });
      if (!data.length) {
        return ResponseHelper.error({
          message: 'No crop data found',
          statusCode: 404,
        });
      }

      return ResponseHelper.success({
        message: 'Crop data retrieved successfully',
        data,
      });
    } catch (error) {
      console.log('Error:', error);
      return ResponseHelper.error({
        message: 'Failed to retrieve crop data',
        statusCode: 500,
      });
    }
  }

  async updateCropImage(cropId: string, imagePath: string) {
    try {
      const crop = await this.cropModel.findByPk(cropId);
      if (!crop) {
        return ResponseHelper.error({
          message: 'Crop not found',
          statusCode: 404,
        });
      }

      await crop.update({ image: imagePath });
      
      return ResponseHelper.success({
        message: 'Crop image updated successfully',
      });
    } catch (error) {
      return ResponseHelper.error({
        message: 'Failed to update crop image',
        statusCode: 500,
      });
    }
  }
}
