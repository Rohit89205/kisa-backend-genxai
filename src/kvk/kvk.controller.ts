import { Controller, Post, Body } from '@nestjs/common';
import { KvkService } from './kvk.service';

@Controller('kvk')
export class KvkController {
  constructor(private readonly kvkService: KvkService) {}

  @Post('strategy')
  async getStrategy(@Body() body: { district?: string }) {
    const district = body?.district || 'Varanasi';
    return this.kvkService.generateInsights(district);
  }
}
