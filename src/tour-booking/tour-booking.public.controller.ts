import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TourBookingService } from './tour-booking.service';

@ApiTags('Public · Tour bookings')
@Controller('public/tour-bookings')
export class TourBookingPublicController {
  constructor(private readonly tourBookingService: TourBookingService) {}

  @Get('by-code/:code')
  getByCode(@Param('code') code: string) {
    return this.tourBookingService.getByCode(code);
  }
}
