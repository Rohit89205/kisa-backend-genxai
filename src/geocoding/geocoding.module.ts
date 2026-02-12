import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeocodingService } from './geocoding.service';
import { GeocodingController } from './geocoding.controller';

@Module({
  imports: [HttpModule],
  providers: [GeocodingService],
  controllers: [GeocodingController],
  exports: [GeocodingService], // <-- important
})
export class GeocodingModule {}
