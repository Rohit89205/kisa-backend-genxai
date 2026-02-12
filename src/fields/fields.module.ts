import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { Sequelize } from 'sequelize-typescript';
import { Field } from './models/field.model';
import { FieldHealth } from './models/field_health.model';
import { SatelliteScenes } from './models/satellite_scenes.model';
import { VegetationIndices } from './models/vegetation_indices.model';
import { SoilFeature } from '../soil/models/soil-feature.model';
import { FieldActivities } from './models/field_activities.model';
import { FieldRisks } from './models/field_risks.model';
import { GrowthStages } from './models/growth_stages.model';
import { UserModule } from '../auth/user.module';
import { User } from '../auth/models/user.model';
import { UserSession } from '../auth/models/user_session.model';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';
import { AuthMiddleware } from '../common/middleware/auth.middleware';
import { SentinelService } from '../common/service/sentinel.service';
import { VegetationIndicesMay2025 } from './models/vegetation_indices_may_2025.model';
import { SoilFeaturesMay2025 } from './models/soil_features_may_2025.model';

@Module({
  imports: [
    UserModule,
    SequelizeModule.forFeature([
      User,
      UserSession,
      Field,
      FieldHealth,
      SatelliteScenes,
      VegetationIndices,
      VegetationIndicesMay2025,
      SoilFeaturesMay2025,
      FieldActivities,
      FieldRisks,
      GrowthStages,
      SoilFeature,
    ]),
    ConfigModule, // ensure ConfigService is available
    JwtModule.registerAsync({
      // register JwtModule so JwtService is injectable
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({}),
    }),
    HttpModule,
  ],
  controllers: [FieldsController],
  providers: [
    FieldsService, 
    AuthMiddleware, 
    SentinelService,
    {
      provide: 'SEQUELIZE',
      useFactory: (sequelize: Sequelize) => sequelize,
      inject: [Sequelize],
    },
  ],
  exports: [FieldsService],
})
export class FieldsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'fields', method: RequestMethod.ALL },
        { path: 'fields/*', method: RequestMethod.ALL },
      );
  }
}
