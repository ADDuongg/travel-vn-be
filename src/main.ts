import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './interceptor/http-fail.interceptor.filter';
import { ResponseTransformInterceptor } from './interceptor/http-success.interceptor.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.use(
    '/payments/webhook/stripe',
    bodyParser.raw({ type: 'application/json' }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 9001;
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // Security headers
  app.use(helmet());
  app.use(cookieParser());

  // CORS from env (comma-separated origins, fallback to localhost for dev)
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
    credentials: true,
    maxAge: 86400,
  });

  // Swagger (dev only)
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('VN Tours API')
      .setDescription('VN Tours backend API documentation')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'bearer',
      )
      .build();

    SwaggerModule.setup('api', app, () => SwaggerModule.createDocument(app, swaggerConfig));
  }

  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/' });
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(port);
}
bootstrap();
