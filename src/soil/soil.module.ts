import { Module,MiddlewareConsumer, RequestMethod  } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { SequelizeModule } from '@nestjs/sequelize';
import { SoilRecommendation } from './models/soil-recommendation.model';
import { SoilService } from './soil.service';
import { SoilController } from './soil.controller';
import { SoilMlService } from './soil-ml.service';
import { SoilFeature } from './models/soil-feature.model';
import { User } from '../auth/models/user.model';
import { UserSession } from '../auth/models/user_session.model';
import { Field } from 'src/fields/models/field.model';
import { VegetationIndices } from 'src/fields/models/vegetation_indices.model';
import { AuthMiddleware } from '../common/middleware/auth.middleware';
import { UserModule } from '../auth/user.module';
import { JwtModule } from '@nestjs/jwt';
import { Sequelize } from 'sequelize-typescript';

@Module({
  imports: [
    UserModule,
    HttpModule, // External APIs: SoilGrids, Sentinel, ML // soil_features table
     SequelizeModule.forFeature([User, UserSession, SoilRecommendation, SoilFeature, Field, VegetationIndices ]), // For AuthMiddleware
        JwtModule.registerAsync({
          // register JwtModule so JwtService is injectable
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({}),
        }),
  ],
  controllers: [
    SoilController,
  ],
  providers: [
    SoilService,
    SoilMlService, // ML bridge service
    AuthMiddleware,
    {
          provide: 'SEQUELIZE',
          useFactory: (sequelize: Sequelize) => sequelize,
          inject: [Sequelize],
        },
  ],
  exports: [
    SoilService,
  ],
})
export class SoilModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'soil', method: RequestMethod.ALL },
        { path: 'soil/*', method: RequestMethod.ALL },
      );
    }
  }
