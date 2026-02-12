import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from './models/user.model';
import { UserSession } from './models/user_session.model';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TokenService } from '../common/service/jwt.service';
import { MailService } from '../common/service/mail.service';
import { AuthMiddleware } from '../common/middleware/auth.middleware';

@Module({
  imports: [
    SequelizeModule.forFeature([User, UserSession]),
    ConfigModule, // ensure ConfigService is available
    JwtModule.registerAsync({   // register JwtModule so JwtService is injectable
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
      }),
    }),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    TokenService,
    MailService,
    AuthMiddleware
  ],
  exports: [TokenService, MailService],
})
export class UserModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'auth/logout', method: RequestMethod.GET });
  }
}
