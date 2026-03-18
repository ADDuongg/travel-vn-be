import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Booking, BookingSchema } from 'src/booking/schema/booking.schema';
import { Payment, PaymentSchema } from 'src/payment/schema/payment.schema';
import { Hotel, HotelSchema } from 'src/hotel/schema/hotel.schema';
import { Room, RoomSchema } from 'src/room/schema/room.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Hotel.name, schema: HotelSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Tour.name, schema: TourSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
