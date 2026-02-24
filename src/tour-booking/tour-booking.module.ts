import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourBookingController } from './tour-booking.controller';
import { TourBookingService } from './tour-booking.service';
import {
  TourBooking,
  TourBookingSchema,
} from './schema/tour-booking.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import {
  TourInventory,
  TourInventorySchema,
} from 'src/tour-inventory/schema/tour-inventory.schema';
import { TourInventoryModule } from 'src/tour-inventory/tour-inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TourBooking.name, schema: TourBookingSchema },
      { name: Tour.name, schema: TourSchema },
      { name: TourInventory.name, schema: TourInventorySchema },
    ]),
    TourInventoryModule,
  ],
  controllers: [TourBookingController],
  providers: [TourBookingService],
  exports: [TourBookingService],
})
export class TourBookingModule {}
