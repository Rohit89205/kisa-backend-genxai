import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filter/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import * as express from 'express';
import { decodeValue } from './common/helper/crypto.helper';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  // const port = configService.get<number>('APP_PORT') || 4000;

  const port =
    process.env.PORT ||
    configService.get<number>('APP_PORT') ||
    4000;
  // const clientUrl = configService.get<string>('CLIENT_URL');

  const clientUrl = 'https://kisaan-saathi-genxai.vercel.app';


  // Add body parser middleware FIRST
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );

  app.enableCors({
    origin: clientUrl,
    credentials: true,
  });

  app.setGlobalPrefix(configService.get<string>('APP_PREFIX') || 'api/v1', {
    exclude: ['/image/*'],
  });

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/image/',
  });

  app.use((req, res, next) => {
    console.log('Request body:', req.body);
    console.log('Secret key:', process.env.CRYPTO_SECRET_KEY);

    if (req.body?.value) {
      try {
        console.log('Encrypted value:', req.body.value);
        console.log('Value type:', typeof req.body.value);
        req.body = decodeValue(req.body.value);
        console.log('Decrypted successfully:', req.body);
      } catch (error) {
        console.error('Decryption error:', error.message);
        return res.status(400).json({ error: 'Invalid encrypted data' });
      }
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());


  await app.listen(port);
};
bootstrap();
