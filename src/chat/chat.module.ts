import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { TourModule } from 'src/tour/tour.module';
import { HotelModule } from 'src/hotel/hotel.module';
import { BookingModule } from 'src/booking/booking.module';
import { ChatTools } from './chat.tools';
import { EnvModule } from 'src/env/env.module';

@Module({
  imports: [TourModule, HotelModule, BookingModule, EnvModule],
  controllers: [ChatController],
  providers: [ChatService, ChatTools],
})
export class ChatModule {}
