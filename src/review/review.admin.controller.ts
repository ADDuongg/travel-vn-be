import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
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
import { ReviewService } from './review.service';
import { ReviewEntityType } from './schema/ewview.schema';
import { AdminReviewStatusDto } from './dto/admin-review-status.dto';
import { parseStatusCsv } from './review.util';

@ApiBearerAuth()
@ApiTags('Admin · Reviews')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/reviews')
export class ReviewAdminController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @RequirePermissions('review.view')
  @ApiCode('review.admin.list')
  findAll(
    @Query('entityType') entityType?: ReviewEntityType,
    @Query('status') statusCsv?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const status = parseStatusCsv(statusCsv);
    return this.reviewService.adminFindAll({
      entityType,
      status,
      includeDeleted: includeDeleted === 'true',
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Patch(':id/approve')
  @RequirePermissions('review.update')
  @ApiCode('review.admin.approve')
  @AuditLog(AuditResourceType.REVIEW)
  approve(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    const adminId = req.user?.userId;
    if (!adminId) {
      throw new BadRequestException('Admin user id missing');
    }
    return this.reviewService.approveReview(id, adminId);
  }

  @Patch(':id/status')
  @RequirePermissions('review.update')
  @ApiCode('review.admin.status')
  @AuditLog(AuditResourceType.REVIEW)
  setStatus(
    @Param('id') id: string,
    @Body() body: AdminReviewStatusDto,
    @Req() req: { user?: { userId: string } },
  ) {
    const adminId = req.user?.userId;
    if (!adminId) {
      throw new BadRequestException('Admin user id missing');
    }
    return this.reviewService.setReviewStatusByAdmin(id, adminId, body);
  }
}
