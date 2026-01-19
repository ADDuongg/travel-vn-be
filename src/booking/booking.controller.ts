import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateRoomBookingDto } from './dto/create-room-booking.dto';
// import { CreateTourBookingDto } from './dto/create-tour-booking.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { BookingQueryDto } from './dto/booking-query.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Controller('api/v1/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('room')
  createRoom(@Body() dto: CreateRoomBookingDto) {
    return this.bookingService.createRoomBooking(dto);
  }

  /* @Post('tour')
  createTour(@Body() dto: CreateTourBookingDto) {
    return this.bookingService.createTourBooking(dto);
  } */

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyBookings(@Req() req, @Query() query: BookingQueryDto) {
    return this.bookingService.getBookingsByUser(req.user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/:id')
  getMyBookingById(@Req() req, @Param('id') bookingId: string) {
    return this.bookingService.getBookingByUserAndId(
      req.user.userId,
      bookingId,
    );
  }

  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('file'))
  uploadReceipt(
    @Param('id') bookingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bookingService.uploadReceipt(bookingId, file);
  }

  @Patch(':id/verify-receipt')
  async verifyReceipt(@Param('id') id: string) {
    return this.bookingService.verifyReceipt(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(id, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.bookingService.cancel(id);
  }
}
