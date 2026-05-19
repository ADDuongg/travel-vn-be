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
import { GLOBAL_HTTP_API_PREFIX } from './config/http-route.constants';
import { EnvService } from './env/env.service';
import { HttpExceptionFilter } from './interceptor/http-fail.interceptor.filter';
import { bootstrapLogger } from './main-bootstrap-logger';

async function bootstrap() {
  bootstrapLogger.info('NestFactory.create…');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  bootstrapLogger.info('NestFactory.create OK');

  app.setGlobalPrefix(GLOBAL_HTTP_API_PREFIX, {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.ALL },
      { path: 'metrics/(.*)', method: RequestMethod.ALL },
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

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  const corsOrigins = env
    .get(
      'CORS_ORIGINS',
      'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000,http://127.0.0.1:3000',
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

    const basePrefixes = [`/${GLOBAL_HTTP_API_PREFIX}`];

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
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: false,
    }),
  );

  bootstrapLogger.info(`listen(${port}, 0.0.0.0)…`);
  await app.listen(port, '0.0.0.0');
  bootstrapLogger.info(
    `Application listening http://0.0.0.0:${port} (NODE_ENV=${isProduction ? 'production' : 'development'})`,
  );
}
bootstrap().catch((err) => {
  bootstrapLogger.error({ err }, 'Bootstrap failed');
  process.exit(1);
});
