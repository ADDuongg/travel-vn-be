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
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { BookingService } from './booking.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateRoomBookingDto } from './dto/create-room-booking.dto';

@ApiBearerAuth()
@ApiTags('Client · Bookings')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('client/bookings')
export class BookingClientController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('room')
  @AuditLog(AuditResourceType.BOOKING)
  createRoom(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateRoomBookingDto,
  ) {
    return this.bookingService.createRoomBooking(dto, req.user.userId);
  }

  @Get('me')
  getMyBookings(@Req() req: { user: { userId: string } }, @Query() query: BookingQueryDto) {
    return this.bookingService.getBookingsByUser(req.user.userId, query);
  }

  @Get('me/:id')
  getMyBookingById(@Req() req: { user: { userId: string } }, @Param('id') bookingId: string) {
    return this.bookingService.getBookingByUserAndId(req.user.userId, bookingId);
  }

  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('file'))
  uploadReceipt(
    @Param('id') bookingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bookingService.uploadReceipt(bookingId, file);
  }

  @Patch(':id/cancel')
  @AuditLog(AuditResourceType.BOOKING)
  cancel(
    @Req() req: { user: { userId: string; role?: string; roles?: string[] } },
    @Param('id') id: string,
  ) {
    return this.bookingService.cancel(
      id,
      req.user.userId,
      req.user.role,
      req.user.roles,
    );
  }
}
