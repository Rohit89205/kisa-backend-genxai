import {
  Controller,
  BadRequestException,
  Get,
  Sse,
  MessageEvent,
  Req,
  Param,
} from '@nestjs/common';
import { WeatherService } from './weather.service';
import { from, map, Observable } from 'rxjs';
import { InjectModel } from '@nestjs/sequelize';
import { Field } from '../fields/models/field.model';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    @InjectModel(Field)
    private readonly fieldModel: typeof Field,
    private readonly sequelize: Sequelize,
  ) {}

  /* ======================================================
     POST /weather/overview  (MAIN DASHBOARD API)
     ====================================================== */
  // @Post('overview')
  // async getWeatherOverview(@Req() req: any) {
  //   const userId = req.user?.id;

  //   if (!userId) {
  //     throw new BadRequestException('User authentication required');
  //   }

  //   try {
  //     const result = await this.sequelize.query(
  //       `SELECT ST_X(ST_Centroid(geom)) as longitude, ST_Y(ST_Centroid(geom)) as latitude 
  //        FROM fields WHERE user_id = ? AND is_selected = true LIMIT 1`,
  //       {
  //         replacements: [userId],
  //         type: QueryTypes.SELECT,
  //       },
  //     );
      
  //     if (result.length === 0) {
  //       throw new BadRequestException('No selected field found');
  //     }

  //     const coords = result[0] as any;
      
  //     return this.weatherService.getWeatherOverview({
  //       latitude: coords.latitude,
  //       longitude: coords.longitude,
  //       timezone: 'UTC',
  //     });
  //   } catch (error) {
  //     console.error('Error getting field coordinates:', error);
  //     throw new BadRequestException('Failed to get weather data');
  //   }
  // }

 

  /* ======================================================
     GET /weather?lat=..&lon=..  (BACKWARD COMPATIBLE)
     ====================================================== */

  @Get()
  async getPointWeather(@Req() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User authentication required');
    }

    try {
      const result = await this.sequelize.query(
        `SELECT ST_X(ST_Centroid(geom)) as longitude, ST_Y(ST_Centroid(geom)) as latitude 
         FROM fields WHERE user_id = ? AND is_selected = true LIMIT 1`,
        {
          replacements: [userId],
          type: QueryTypes.SELECT,
        },
      );
      
      if (result.length === 0) {
        throw new BadRequestException('No selected field found');
      }

      const coords = result[0] as any;
      
      return this.weatherService.getWeatherOverview({
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone: 'UTC',
      });
    } catch (error) {
      console.error('Error getting field coordinates:', error);
      throw new BadRequestException('Failed to get weather data');
    }
  }

  /* ======================================================
     SSE /weather/stream  (REAL-TIME UPDATES)
     ====================================================== */

  @Sse('stream')
  streamWeather(@Req() req: any): Observable<MessageEvent> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User authentication required');
    }

    return from(
      this.sequelize.query(
        `SELECT ST_X(ST_Centroid(geom)) as longitude, ST_Y(ST_Centroid(geom)) as latitude 
         FROM fields WHERE user_id = ? AND is_selected = true LIMIT 1`,
        {
          replacements: [userId],
          type: QueryTypes.SELECT,
        },
      ).then(result => {
        if (result.length === 0) {
          throw new BadRequestException('No selected field found');
        }
        
        const coords = result[0] as any;
        
        return this.weatherService.getWeatherOverview({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timezone: 'UTC',
        });
      })
    ).pipe(
      map((data) => ({
        data,
      })),
    );
  }
  // ============================================================
  // GET /weather/by-field/:fieldId  (FIELD-BASED WEATHER DATA)
  // ============================================================ 
@Get('by-field/:fieldId')
async getWeatherByField(
  @Param('fieldId') fieldId: string,
  @Req() req: any,
) {
  const userId = req.user?.id;

  if (!userId) {
    throw new BadRequestException('User authentication required');
  }

  const result = await this.sequelize.query(
    `SELECT 
        ST_X(ST_Centroid(geom)) as longitude,
        ST_Y(ST_Centroid(geom)) as latitude
     FROM fields
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    {
      replacements: [fieldId, userId],
      type: QueryTypes.SELECT,
    },
  );

  if (result.length === 0) {
    throw new BadRequestException('Field not found or access denied');
  }

  const coords = result[0] as any;

  return this.weatherService.getWeatherOverview({
    latitude: coords.latitude,
    longitude: coords.longitude,
    timezone: 'UTC',
  });
}

}
