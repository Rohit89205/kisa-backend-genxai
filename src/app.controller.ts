import { Controller, Get, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('state-districts')
  async getStateDistricts() {
    return await this.appService.getStateDistricts();
  }

  @Get('sub-districts')
  async getSubDistricts(@Query('district') district: string, @Res() res: any) {
    const result = await this.appService.getSubDistricts(district);  
    return res.status(result.statusCode).json(result);
  }
}
