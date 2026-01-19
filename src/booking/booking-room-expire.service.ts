// payment-expire.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Booking,
  BookingPaymentStatus,
  BookingStatus,
} from './schema/booking.schema';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';

@Injectable()
export class ExpirePendingBookings {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    private readonly roomInventoryService: RoomInventoryService,
  ) {}

  @Cron('*/10 * * * *')
  async expirePendingBookings() {
    const EXPIRE_AFTER_MINUTES = 60;

    const expiredAt = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000);

    const bookings = await this.bookingModel.find({
      status: BookingStatus.PENDING,
      createdAt: { $lt: expiredAt },
    });

    for (const booking of bookings) {
      //  idempotent
      if (booking.status !== BookingStatus.PENDING) continue;

      const quantity = booking.rooms.length;
      const room = booking.rooms[0];

      await this.roomInventoryService.rollbackInventoryRange(
        room.roomId,
        room.checkIn,
        room.checkOut,
        quantity,
      );

      booking.status = BookingStatus.CANCELLED;
      booking.paymentStatus = BookingPaymentStatus.EXPIRED;

      await booking.save();
    }
  }
}
