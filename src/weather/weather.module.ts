import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { SequelizeModule } from '@nestjs/sequelize';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { GeocodingService } from '../geocoding/geocoding.service';
import { Field } from '../fields/models/field.model';
import { User } from '../auth/models/user.model';
import { UserSession } from '../auth/models/user_session.model';
import { AuthMiddleware } from '../common/middleware/auth.middleware';
import { UserModule } from '../auth/user.module';
import { JwtModule } from '@nestjs/jwt';
import { Sequelize } from 'sequelize-typescript';
@Module({
  imports: [
    UserModule,
    HttpModule,
    ConfigModule,
    SequelizeModule.forFeature([User, UserSession, Field]),
    JwtModule.registerAsync({
      // register JwtModule so JwtService is injectable
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({}),
    }),
  ],
  controllers: [WeatherController],
  providers: [
    WeatherService,
    GeocodingService,
    AuthMiddleware,
    {
      provide: 'SEQUELIZE',
      useFactory: (sequelize: Sequelize) => sequelize,
      inject: [Sequelize],
    },
  ],
  exports: [WeatherService],
})
export class WeatherModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'weather', method: RequestMethod.ALL },
        { path: 'weather/*', method: RequestMethod.ALL },
      );
  }
}
