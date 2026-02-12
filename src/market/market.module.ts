import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { Sequelize } from 'sequelize-typescript';

import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { DataGovProvider } from './data-gov.provider';
import { CacheProvider } from './cache.provider';
import { MarketGateway } from './market.gateway';
import { MarketMlController } from './market-ml.controller';

import { User } from '../auth/models/user.model';
import { UserSession } from '../auth/models/user_session.model';
import { AuthMiddleware } from '../common/middleware/auth.middleware';
import { UserModule } from '../auth/user.module';
import { PriceDynamicsService } from './price-dynamics.service';
import { PriceDynamicsController } from './price-dynamics.controller';

@Module({
  imports: [
    UserModule,       // 🔥 IMPORTANT (gives TokenService)
    HttpModule,
    ConfigModule,
    SequelizeModule.forFeature([User, UserSession]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({}),
    }),
  ],

  controllers: [
    PriceDynamicsController,
    MarketController,
    MarketMlController
  ],

  providers: [
    MarketService,
    DataGovProvider,
    CacheProvider,
    MarketGateway,
    AuthMiddleware, 
    PriceDynamicsService,
    {
      provide: 'SEQUELIZE',
      useFactory: (sequelize: Sequelize) => sequelize,
      inject: [Sequelize],
    },
  ],

  exports: [MarketService],
})
export class MarketModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
     'markets/state-districts',
     'markets/commodities'
    )
      .forRoutes(
        { path: 'markets', method: RequestMethod.ALL },
        { path: 'markets/*', method: RequestMethod.ALL },
      );
  }
}
