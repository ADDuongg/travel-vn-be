import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './interceptor/http-fail.interceptor.filter';
import { ResponseTransformInterceptor } from './interceptor/http-success.interceptor.filter';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/role.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const reflector = app.get(Reflector);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 9001;
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'bearer',
    )
    .build();
  app.enableCors({
    origin: ['http://localhost:5174', 'http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
    credentials: true,
    maxAge: 86400,
  });
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());
  /* app.useGlobalGuards(new JwtAuthGuard(), new RolesGuard(reflector)); */
  await app.listen(port);
}
bootstrap();
