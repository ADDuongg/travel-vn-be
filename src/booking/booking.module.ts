import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomInventoryModule } from 'src/room-inventory/room-inventory.module';
import { RoomModule } from 'src/room/room.module';
import { BookingAdminController } from './booking.admin.controller';
import { BookingClientController } from './booking.client.controller';
import { BookingService } from './booking.service';
import { Booking, BookingSchema } from './schema/booking.schema';
import { ExpirePendingBookings } from './booking-room-expire.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { BookingReconcileService } from './booking-reconcile.service';
import { PaymentModule } from 'src/payment/payment.module';
import { BookingRepository } from './booking.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    forwardRef(() => PaymentModule),
    RoomModule,
    RoomInventoryModule,
    CloudinaryModule,
  ],
  controllers: [BookingClientController, BookingAdminController],
  providers: [
    BookingRepository,
    BookingService,
    ExpirePendingBookings,
    BookingReconcileService,
  ],
  exports: [BookingService],
})
export class BookingModule {}
