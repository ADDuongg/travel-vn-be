import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiPermissionModule } from './api-permission/api-permission.module';
import { ApiRoleModule } from './api-role/api-role.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EnvModule } from './env/env.module';
import { LanguageModule } from './language/language.module';
import { logger } from './middleware/logger.middleware';
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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URI'),
      }),
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(logger).forRoutes(ProductController);
  }
}
