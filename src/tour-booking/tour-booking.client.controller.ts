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
import { CancelTourBookingDto } from './dto/cancel-tour-booking.dto';
import { CreateTourBookingDto } from './dto/create-tour-booking.dto';
import { TourBookingService } from './tour-booking.service';

@ApiBearerAuth()
@ApiTags('Client · Tour bookings')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('client/tour-bookings')
export class TourBookingClientController {
  constructor(private readonly tourBookingService: TourBookingService) {}

  @Post()
  @AuditLog(AuditResourceType.TOUR_BOOKING)
  create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateTourBookingDto,
  ) {
    return this.tourBookingService.create(dto, req.user.userId);
  }

  @Get('my-bookings')
  getMyBookings(
    @Req() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tourBookingService.getMyBookings(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('my-bookings/:code')
  getMyBookingByCode(
    @Req() req: { user: { userId: string } },
    @Param('code') code: string,
  ) {
    return this.tourBookingService.getByCodeForUser(req.user.userId, code);
  }

  @Patch(':id/cancel')
  @AuditLog(AuditResourceType.TOUR_BOOKING)
  cancel(
    @Req() req: { user: { userId: string; role?: string; roles?: string[] } },
    @Param('id') id: string,
    @Body() body: CancelTourBookingDto,
  ) {
    return this.tourBookingService.cancel(
      id,
      body.reason,
      req.user.userId,
      req.user.role,
      req.user.roles,
    );
  }

  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('file'))
  uploadReceipt(
    @Param('id') tourBookingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tourBookingService.uploadReceipt(tourBookingId, file);
  }
}
