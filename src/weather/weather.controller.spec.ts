import { Test, TestingModule } from '@nestjs/testing';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { Sequelize } from 'sequelize-typescript';

describe('WeatherController', () => {
  let controller: WeatherController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [
        {
          provide: WeatherService,
          useValue: {
            getWeather: jest.fn(),
            getForecast: jest.fn(),
          },
        },
        {
          provide: 'FieldRepository',
          useValue: {}, // mock FieldRepository
        },
        {
          provide: Sequelize,
          useValue: {}, // mock Sequelize
        },
      ],
    }).compile();

    controller = module.get<WeatherController>(WeatherController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
