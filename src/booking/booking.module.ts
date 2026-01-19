import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomInventoryModule } from 'src/room-inventory/room-inventory.module';
import { RoomModule } from 'src/room/room.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking, BookingSchema } from './schema/booking.schema';
import { ExpirePendingBookings } from './booking-room-expire.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    RoomModule,
    RoomInventoryModule,
    CloudinaryModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, ExpirePendingBookings],
  exports: [BookingService],
})
export class BookingModule {}
