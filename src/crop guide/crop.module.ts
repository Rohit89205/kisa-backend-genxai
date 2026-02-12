import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { CropController } from './crop.controller';
import { CropService } from './crop.service';
import { CropSop } from './models/crop-sop.model';
import { Crop } from './models/crop.model';
import { AuthMiddleware } from '../common/middleware/auth.middleware';
import { UserModule } from '../auth/user.module';
import { User } from '../auth/models/user.model';
import { UserSession } from '../auth/models/user_session.model';

@Module({
  imports: [
    UserModule,
    SequelizeModule.forFeature([Crop, CropSop, User, UserSession]),
    ConfigModule, // ensure ConfigService is available
    JwtModule.registerAsync({
      // register JwtModule so JwtService is injectable
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({}),
    }),
  ],
  controllers: [CropController],
  providers: [CropService, AuthMiddleware],
})
export class CropModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'crop', method: RequestMethod.ALL },
        { path: 'crop/*', method: RequestMethod.ALL },
      );
  }
}
