import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourBookingAdminController } from './tour-booking.admin.controller';
import { TourBookingClientController } from './tour-booking.client.controller';
import { TourBookingPublicController } from './tour-booking.public.controller';
import { TourBookingService } from './tour-booking.service';
import { TourBooking, TourBookingSchema } from './schema/tour-booking.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import {
  TourInventory,
  TourInventorySchema,
} from 'src/tour-inventory/schema/tour-inventory.schema';
import { TourInventoryModule } from 'src/tour-inventory/tour-inventory.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { Payment, PaymentSchema } from 'src/payment/schema/payment.schema';
import { TourBookingExpireService } from './tour-booking-expire.service';
import { TourBookingReconcileService } from './tour-booking-reconcile.service';
import {
  TourGuide,
  TourGuideSchema,
} from 'src/tour-guide/schema/tour-guide.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TourBooking.name, schema: TourBookingSchema },
      { name: Tour.name, schema: TourSchema },
      { name: TourInventory.name, schema: TourInventorySchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: TourGuide.name, schema: TourGuideSchema },
    ]),
    TourInventoryModule,
    CloudinaryModule,
  ],
  controllers: [
    TourBookingPublicController,
    TourBookingClientController,
    TourBookingAdminController,
  ],
  providers: [
    TourBookingService,
    TourBookingExpireService,
    TourBookingReconcileService,
  ],
  exports: [TourBookingService],
})
export class TourBookingModule {}
