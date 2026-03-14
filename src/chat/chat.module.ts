import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { TourModule } from 'src/tour/tour.module';
import { HotelModule } from 'src/hotel/hotel.module';
import { BookingModule } from 'src/booking/booking.module';

@Module({
  imports: [TourModule, HotelModule, BookingModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
