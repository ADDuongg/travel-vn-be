import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { BookingService } from './booking.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { RefundBookingDto } from './dto/refund-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiBearerAuth()
@ApiTags('Admin · Bookings')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/bookings')
export class BookingAdminController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @RequirePermissions('booking.view')
  getAll(@Query() query: BookingQueryDto) {
    return this.bookingService.getAllBookings(query);
  }

  @Get(':id')
  @RequirePermissions('booking.view')
  findOne(@Param('id') id: string) {
    return this.bookingService.getBookingByIdForAdmin(id);
  }

  @Patch(':id')
  @RequirePermissions('booking.update')
  @AuditLog(AuditResourceType.BOOKING)
  @ApiCode('booking.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(id, dto);
  }

  @Patch(':id/verify-receipt')
  @RequirePermissions('booking.update')
  @ApiCode('booking.admin.verifyReceipt')
  async verifyReceipt(@Param('id') id: string) {
    return this.bookingService.verifyReceipt(id);
  }

  @Patch(':id/mark-paid')
  @RequirePermissions('booking.update')
  @ApiCode('booking.admin.markPaid')
  async markPaid(@Param('id') id: string) {
    return this.bookingService.markAsPaid(id);
  }

  @Patch(':id/refund')
  @RequirePermissions('booking.refund')
  @ApiCode('booking.admin.refund')
  async refund(@Param('id') id: string, @Body() body: RefundBookingDto) {
    return this.bookingService.markAsRefunded(id, body.fullyRefunded ?? true);
  }
}
