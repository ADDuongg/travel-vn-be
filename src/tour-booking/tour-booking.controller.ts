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
import { TourBookingService } from './tour-booking.service';
import { CreateTourBookingDto } from './dto/create-tour-booking.dto';
import { PaymentTourBookingDto } from './dto/payment-tour-booking.dto';
import { CancelTourBookingDto } from './dto/cancel-tour-booking.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TourGuide } from 'src/tour-guide/schema/tour-guide.schema';

class AssignGuideDto {
  @IsString()
  @Type(() => String)
  guideId: string;
}
import { TourBookingStatus } from './schema/tour-booking.schema';

@Controller('api/v1/tour-bookings')
export class TourBookingController {
  constructor(private readonly tourBookingService: TourBookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateTourBookingDto,
  ) {
    return this.tourBookingService.create(dto, req.user.userId);
  }

  @Get('by-code/:code')
  getByCode(@Param('code') code: string) {
    return this.tourBookingService.getByCode(code);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  getMyBookingByCode(
    @Req() req: { user: { userId: string } },
    @Param('code') code: string,
  ) {
    return this.tourBookingService.getByCodeForUser(req.user.userId, code);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.tourBookingService.confirm(id);
  }

  @Patch(':id/assign-guide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  assignGuide(@Param('id') id: string, @Body() body: AssignGuideDto) {
    return this.tourBookingService.assignGuide(id, body.guideId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
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

  @Post(':id/payment')
  recordPayment(@Param('id') id: string, @Body() dto: PaymentTourBookingDto) {
    return this.tourBookingService.recordPayment(id, dto);
  }

  /** User upload ảnh chuyển khoản (bank receipt) */
  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('file'))
  uploadReceipt(
    @Param('id') tourBookingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tourBookingService.uploadReceipt(tourBookingId, file);
  }

  /** Admin xác nhận đã nhận tiền (verify receipt) → đơn chuyển PAID */
  @Patch(':id/verify-receipt')
  verifyReceipt(@Param('id') id: string) {
    return this.tourBookingService.verifyReceipt(id);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  listForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TourBookingStatus,
  ) {
    return this.tourBookingService.listForAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.tourBookingService.getById(id);
  }
}
