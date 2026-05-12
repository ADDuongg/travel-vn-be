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

import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';

@ApiBearerAuth()
@ApiTags('Admin · Tours')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/tours')
export class TourAdminController {
  constructor(private readonly tourService: TourService) {}

  @Post()
  @RequirePermissions('tour.create')
  @AuditLog(AuditResourceType.TOUR)
  @ApiCode('tour.admin.create')
  create(@Body() dto: CreateTourDto) {
    return this.tourService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('tour.update')
  @AuditLog(AuditResourceType.TOUR)
  @ApiCode('tour.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateTourDto) {
    return this.tourService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('tour.delete')
  @AuditLog(AuditResourceType.TOUR)
  @ApiCode('tour.admin.delete')
  delete(@Param('id') id: string) {
    return this.tourService.delete(id);
  }
}
