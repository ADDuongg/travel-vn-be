import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { EnvService } from './env/env.service';
import { HttpExceptionFilter } from './interceptor/http-fail.interceptor.filter';
import { ResponseTransformInterceptor } from './interceptor/http-success.interceptor.filter';

async function bootstrap() {
  // stderr so logs appear even if Nest bufferLogs never flushes (startup hang/crash)
  const mark = (msg: string) => console.error(`[bootstrap] ${msg}`);
  mark('NestFactory.create…');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  mark('NestFactory.create OK');

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
      { path: 'payments/(.*)', method: RequestMethod.ALL },
      { path: 'orders/(.*)', method: RequestMethod.ALL },
      { path: 'upload', method: RequestMethod.ALL },
      { path: 'upload/(.*)', method: RequestMethod.ALL },
      { path: 'routers', method: RequestMethod.ALL },
      { path: 'routers/(.*)', method: RequestMethod.ALL },
      { path: 'idempotency', method: RequestMethod.ALL },
      { path: 'idempotency/(.*)', method: RequestMethod.ALL },
      { path: 'api/chat', method: RequestMethod.ALL },
      { path: 'api/chat/(.*)', method: RequestMethod.ALL },
    ],
  });

  app.useLogger(app.get(Logger));

  app.use(
    '/payments/webhook/stripe',
    bodyParser.raw({ type: 'application/json' }),
  );

  const env = app.get(EnvService);
  const port = env.get('PORT', 9001);
  const isProduction = env.isProduction();

  // Security headers
  app.use(helmet());
  app.use(cookieParser());

  // CORS from env (comma-separated origins, fallback to localhost for dev)
  const corsOrigins = env
    .get(
      'CORS_ORIGINS',
      'http://localhost:5173,http://localhost:5174,http://localhost:5175',
    )
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
    credentials: true,
    maxAge: 86400,
  });

  // Swagger (dev only) — filtered UIs for public vs client vs admin prefixes
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

    type OpenApiDoc = ReturnType<typeof SwaggerModule.createDocument>;

    function pickPathsByPrefixes(
      document: OpenApiDoc,
      prefixes: string[],
    ): OpenApiDoc {
      const pathsEntries = Object.entries(document.paths ?? {}).filter(
        ([routePath]) => prefixes.some((p) => routePath.startsWith(p)),
      );
      return {
        ...document,
        paths: Object.fromEntries(pathsEntries),
      };
    }

    const fullDoc = (): OpenApiDoc =>
      SwaggerModule.createDocument(app, swaggerConfig);

    const basePrefixes = ['/api/v1'];

    SwaggerModule.setup('api/docs/all', app, () => fullDoc());
    SwaggerModule.setup('api/docs/public', app, () =>
      pickPathsByPrefixes(
        fullDoc(),
        basePrefixes.map((b) => `${b}/public`),
      ),
    );
    SwaggerModule.setup('api/docs/client', app, () =>
      pickPathsByPrefixes(
        fullDoc(),
        basePrefixes.map((b) => `${b}/client`),
      ),
    );
    SwaggerModule.setup('api/docs/admin', app, () =>
      pickPathsByPrefixes(
        fullDoc(),
        basePrefixes.map((b) => `${b}/admin`),
      ),
    );
  }

  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/' });
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: false,
    }),
  );

  mark(`listen(${port}, 0.0.0.0)…`);
  await app.listen(port, '0.0.0.0');
  mark(`listening on 0.0.0.0:${port}`);
}
bootstrap().catch((err) => {
  // Ensure the error is visible even when bufferLogs swallows NestJS output
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
