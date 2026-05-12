import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';

import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';

@ApiBearerAuth()
@ApiTags('Admin · Hotels')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/hotels')
export class HotelAdminController {
  constructor(private readonly hotelService: HotelService) {}

  @Post()
  @RequirePermissions('hotel.create')
  @AuditLog(AuditResourceType.HOTEL)
  @ApiCode('hotel.admin.create')
  create(@Body() dto: CreateHotelDto) {
    return this.hotelService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('hotel.update')
  @AuditLog(AuditResourceType.HOTEL)
  @ApiCode('hotel.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateHotelDto) {
    return this.hotelService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('hotel.delete')
  @AuditLog(AuditResourceType.HOTEL)
  @ApiCode('hotel.admin.delete')
  remove(@Param('id') id: string) {
    return this.hotelService.remove(id);
  }
}
