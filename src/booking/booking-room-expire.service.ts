// payment-expire.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  Booking,
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from './schema/booking.schema';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { NotificationEvent } from 'src/notification/notification.constants';
import { RoomBookingPaymentExpiredClientEvent } from 'src/notification/events/booking-payment-expired-client.event';

@Injectable()
export class ExpirePendingBookings {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    private readonly roomInventoryService: RoomInventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expirePendingBookings() {
    const EXPIRE_AFTER_MINUTES = 60;

    const expiredAt = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000);

    const bookings = await this.bookingModel.find({
      bookingType: BookingType.ROOM,
      status: BookingStatus.PENDING,
      paymentStatus: BookingPaymentStatus.UNPAID,
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

      if (booking.userId) {
        this.eventEmitter.emit(
          NotificationEvent.ROOM_BOOKING_PAYMENT_EXPIRED,
          new RoomBookingPaymentExpiredClientEvent(
            String(booking.userId),
            String(booking._id),
          ),
        );
      }
    }
  }
}
