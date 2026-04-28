import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { CreateTourGuideDto } from './dto/create-tour-guide.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { VerifyTourGuideDto } from './dto/verify-tour-guide.dto';
import { TourGuideService } from './tour-guide.service';

@ApiBearerAuth()
@ApiTags('Admin · Tour guides')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/tour-guides')
export class TourGuideAdminController {
  constructor(private readonly tourGuideService: TourGuideService) {}

  @Post()
  @RequirePermissions('tour_guide.create')
  @AuditLog(AuditResourceType.TOUR_GUIDE)
  @ApiCode('tour-guide.admin.create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cv', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ]),
  )
  create(
    @Body() dto: CreateTourGuideDto,
    @Req() req: { files?: Record<string, Express.Multer.File[]> },
  ) {
    const cv = req.files?.cv?.[0];
    const gallery = req.files?.gallery ?? [];
    return this.tourGuideService.create(dto, cv, gallery);
  }

  @Patch(':id/verify')
  @RequirePermissions('tour_guide.update')
  @ApiCode('tour-guide.admin.verify')
  verify(@Param('id') id: string, @Body() dto: VerifyTourGuideDto) {
    return this.tourGuideService.verify(id, dto.isVerified);
  }

  @Patch(':id/availability')
  @RequirePermissions('tour_guide.update')
  @ApiCode('tour-guide.admin.toggleAvailability')
  toggleAvailability(@Param('id') id: string) {
    return this.tourGuideService.toggleAvailability(id);
  }

  @Patch(':id')
  @RequirePermissions('tour_guide.update')
  @AuditLog(AuditResourceType.TOUR_GUIDE)
  @ApiCode('tour-guide.admin.update')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cv', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ]),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTourGuideDto,
    @Req() req: { files?: Record<string, Express.Multer.File[]> },
  ) {
    const cv = req.files?.cv?.[0];
    const gallery = req.files?.gallery ?? [];
    return this.tourGuideService.update(id, dto, cv, gallery);
  }

  @Delete(':id')
  @RequirePermissions('tour_guide.delete')
  @AuditLog(AuditResourceType.TOUR_GUIDE)
  @ApiCode('tour-guide.admin.delete')
  softDelete(@Param('id') id: string) {
    return this.tourGuideService.softDelete(id);
  }
}
