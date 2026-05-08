// booking-room-expire.service.ts — expire unpaid room bookings and release inventory
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createDomainEventEnvelope } from 'src/common/events/domain-event';

import {
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from './schema/booking.schema';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { NotificationEvent } from 'src/notification/notification.constants';
import { RoomBookingPaymentExpiredClientEvent } from 'src/notification/events/booking-payment-expired-client.event';
import { BookingRepository } from './booking.repository';
import { DatabaseTransactionService } from 'src/common/database/database-transaction.service';

@Injectable()
export class ExpirePendingBookings {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly roomInventoryService: RoomInventoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly transactionService: DatabaseTransactionService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expirePendingBookings() {
    const EXPIRE_AFTER_MINUTES = 60;

    const expiredAt = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000);

    const bookings =
      await this.bookingRepository.findPendingRoomBookingsToExpire(expiredAt);

    for (const booking of bookings) {
      if (booking.status !== BookingStatus.PENDING) continue;

      const quantity = booking.rooms.length;
      const room = booking.rooms[0];

      await this.transactionService.runInTransaction(async (session) => {
        await this.roomInventoryService.rollbackInventoryRange(
          room.roomId,
          room.checkIn,
          room.checkOut,
          quantity,
          session,
        );

        booking.status = BookingStatus.CANCELLED;
        booking.paymentStatus = BookingPaymentStatus.EXPIRED;

        await this.bookingRepository.save(booking, session);
      });

      if (booking.userId) {
        this.eventEmitter.emit(
          NotificationEvent.ROOM_BOOKING_PAYMENT_EXPIRED,
          createDomainEventEnvelope({
            eventName: String(NotificationEvent.ROOM_BOOKING_PAYMENT_EXPIRED),
            source: ExpirePendingBookings.name,
            payload: new RoomBookingPaymentExpiredClientEvent(
              String(booking.userId),
              String(booking._id),
            ),
          }),
        );
      }
    }
  }
}
