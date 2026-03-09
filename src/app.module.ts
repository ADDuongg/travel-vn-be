import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { validateEnv } from './config/env.validation';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ApiPermissionModule } from './api-permission/api-permission.module';
import { ApiRoleModule } from './api-role/api-role.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { EnvModule } from './env/env.module';
import { HealthModule } from './health/health.module';
import { LanguageModule } from './language/language.module';
import { loggerMiddleware } from './middleware/logger.middleware';
import { PermissionModule } from './permission/permission.module';
import { ProductController } from './product/product.controller';
import { ProductModule } from './product/product.module';
import { RolesModule } from './roles/roles.module';
import { RouterRoleModule } from './router-role/router-role.module';
import { RoutersModule } from './routers/routers.module';
import { SharedModule } from './shared/shared.module';
import { EventsModule } from './socket/socket.module';
import { UploadModule } from './upload/upload.module';
import { UserModule } from './user/user.module';
import { MediaModule } from './media/media.module';
import { RoomModule } from './room/room.module';
import { AmenitiesModule } from './amenities/amenities.module';
import { ReviewModule } from './review/review.module';
import { PaymentModule } from './payment/payment.module';
import { OrdersModule } from './orders/orders.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingModule } from './booking/booking.module';
import { HotelModule } from './hotel/hotel.module';
import { RoomInventoryModule } from './room-inventory/room-inventory.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { ProvincesModule } from './provinces/provinces.module';
import { TourModule } from './tour/tour.module';
import { TourInventoryModule } from './tour-inventory/tour-inventory.module';
import { TourBookingModule } from './tour-booking/tour-booking.module';
import { TourGuideModule } from './tour-guide/tour-guide.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const logLevel = config.get<string>('LOG_LEVEL') || (isProduction ? 'info' : 'debug');
        return {
          pinoHttp: {
            level: logLevel,
            transport: isProduction
              ? undefined
              : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-api-key"]',
            ],
            // Trim log payload: chỉ giữ fields cần thiết, bỏ security headers của helmet
            serializers: {
              req(req: any) {
                return {
                  id: req.id,
                  method: req.method,
                  url: req.url,
                  query: req.query,
                  remoteAddress: req.remoteAddress,
                  userAgent: req.headers?.['user-agent'],
                };
              },
              res(res: any) {
                return {
                  statusCode: res.statusCode,
                };
              },
              err: (err: Error & { status?: number; code?: string }) => ({
                type: err.constructor?.name,
                message: err.message,
                stack: err.stack,
                status: err.status,
                code: err.code,
              }),
            },
            customProps: (req: any) => ({
              requestId: req.headers['x-request-id'],
            }),
          },
        };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URI'),
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    HealthModule,
    ProductModule,
    OrdersModule,
    UserModule,
    AuthModule,
    UploadModule,
    EventsModule,
    EnvModule,
    SharedModule,
    RolesModule,
    RoutersModule,
    ApiPermissionModule,
    RouterRoleModule,
    ApiRoleModule,
    PermissionModule,
    LanguageModule,
    CloudinaryModule,
    MediaModule,
    RoomModule,
    AmenitiesModule,
    ReviewModule,
    PaymentModule,
    OrdersModule,
    BookingModule,
    HotelModule,
    RoomInventoryModule,
    IdempotencyModule,
    ProvincesModule,
    TourModule,
    TourInventoryModule,
    TourBookingModule,
    TourGuideModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(loggerMiddleware).forRoutes(ProductController);
  }
}
