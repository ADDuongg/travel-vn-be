import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { PaymentTourBookingDto } from './dto/payment-tour-booking.dto';
import { TourBookingStatus } from './schema/tour-booking.schema';
import { TourBookingService } from './tour-booking.service';

class AssignGuideDto {
  @IsString()
  @Type(() => String)
  guideId: string;
}

@ApiBearerAuth()
@ApiTags('Admin · Tour bookings')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/tour-bookings')
export class TourBookingAdminController {
  constructor(private readonly tourBookingService: TourBookingService) {}

  @Get()
  @RequirePermissions('booking.view')
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
  @RequirePermissions('booking.view')
  getById(@Param('id') id: string) {
    return this.tourBookingService.getById(id);
  }

  @Patch(':id/confirm')
  @RequirePermissions('booking.update')
  @AuditLog(AuditResourceType.TOUR_BOOKING)
  @ApiCode('tour-booking.admin.confirm')
  confirm(@Param('id') id: string) {
    return this.tourBookingService.confirm(id);
  }

  @Patch(':id/assign-guide')
  @RequirePermissions('booking.update')
  @ApiCode('tour-booking.admin.assignGuide')
  assignGuide(@Param('id') id: string, @Body() body: AssignGuideDto) {
    return this.tourBookingService.assignGuide(id, body.guideId);
  }

  @Post(':id/payment')
  @RequirePermissions('booking.update')
  @ApiCode('tour-booking.admin.payment')
  recordPayment(@Param('id') id: string, @Body() dto: PaymentTourBookingDto) {
    return this.tourBookingService.recordPayment(id, dto);
  }

  @Patch(':id/verify-receipt')
  @RequirePermissions('booking.update')
  @ApiCode('tour-booking.admin.verifyReceipt')
  verifyReceipt(@Param('id') id: string) {
    return this.tourBookingService.verifyReceipt(id);
  }
}
