import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  root() {
    console.log('🔥 HEALTH HIT 🔥');
    return {
      status: 'success',
      message: 'Kisaan Saathi Backend is running 🚀',
    };
  }
}
