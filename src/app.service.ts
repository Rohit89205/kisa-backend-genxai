import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ResponseHelper } from './common/helper/response.helper';
import { StateDistrict } from './app.models/state-district.model';
import { DistrictSubdistricts } from './app.models/district_subdistricts.model';
@Injectable()
export class AppService {
  constructor(
    @InjectModel(StateDistrict)
    private readonly stateDistrictModel: typeof StateDistrict,
    @InjectModel(DistrictSubdistricts)
    private readonly subDistrictModel: typeof DistrictSubdistricts
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getStateDistricts(): Promise<any> {
    try {
      const stateDistrictData = await this.stateDistrictModel.findAll({ raw: true });
      return ResponseHelper.success({
        message: 'State and district data fetched successfully',
        data: stateDistrictData,
        statusCode: 200,
      });
    } catch (error: any) {
      console.log('Error fetching state and district data:', error);
      return ResponseHelper.error({
        message: 'Failed to fetch state and district data',
        statusCode: 500,
      });
    }
  }

  async getSubDistricts(district: string): Promise<any> {
    try {
      // Assuming there's a SubDistrict model similar to StateDistrict
      const subDistrictData = await this.subDistrictModel.findAll({ 
        where: { district_name: district }, raw: true 
    });
      return ResponseHelper.success({
        message: 'Sub-district data fetched successfully',
        data: subDistrictData,
        statusCode: 200,
      });
    } catch (error: any) {
      console.log('Error fetching sub-district data:', error);
      return ResponseHelper.error({
        message: 'Failed to fetch sub-district data',
        statusCode: 500,
      });
    }
  }
}
