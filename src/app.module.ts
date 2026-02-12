import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { WeatherModule } from './weather/weather.module';
import { SoilModule } from './soil/soil.module';
import { UserModule } from './auth/user.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { MarketModule } from './market/market.module';
import { FieldsModule } from './fields/fields.module';
import { KvkModule } from './kvk/kvk.module';
import { CropModule } from './crop guide/crop.module';
import { StateDistrict } from './app.models/state-district.model';
import { StateDistrictCrops } from './app.models/state-district-crop.model';
import { AppService } from './app.service';
import { Sequelize } from 'sequelize-typescript';
import { Dialect } from 'sequelize';
import { AppController } from './app.controller';
import { DistrictSubdistricts } from './app.models/district_subdistricts.model';
import { HealthController } from './health.controller';
@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),
    // Scheduling module
    ScheduleModule.forRoot(),
    // Sequelize config using .env
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          dialect: 'postgres' as Dialect,
          host: config.get<string>('DB_HOST'),
          port: parseInt(config.get<string>('DB_PORT') || '5432', 10),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          autoLoadModels: true,
          synchronize: false,
          logging: true,
          sync: { alter: false },
          pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
          },
          dialectOptions: {
            connectTimeout: 60000,
          },
        };
      },
    }),
    SequelizeModule.forFeature([StateDistrict, DistrictSubdistricts, StateDistrictCrops]),
    WeatherModule,
    SoilModule,
    GeocodingModule,
    UserModule,
    MarketModule,
    FieldsModule,
    KvkModule,
    CropModule,
  ],
  controllers: [AppController, HealthController],
  
  providers: [
    AppService,
    {
      provide: 'SEQUELIZE',
      useFactory: (sequelize: Sequelize) => sequelize,
      inject: [Sequelize],
    },
  ],
  exports: [AppService],
})
export class AppModule {}
