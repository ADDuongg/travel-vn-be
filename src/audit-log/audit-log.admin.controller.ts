import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { AuditLogService } from './audit-log.service';
import { AuditLogExportService } from './audit-log-export.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogExportQueryDto } from './dto/audit-log-export-query.dto';

@ApiBearerAuth()
@ApiTags('Admin · Audit logs')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/audit-logs')
export class AuditLogAdminController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditLogExportService: AuditLogExportService,
  ) {}

  @Get()
  @RequirePermissions('audit_log.view')
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }

  @Get('export')
  @RequirePermissions('audit_log.view')
  async exportLogs(
    @Query() query: AuditLogExportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.auditLogService.findAllForExport(query);

    if (query.format === 'xlsx') {
      return this.auditLogExportService.exportXlsx(data, res);
    }

    return this.auditLogExportService.exportCsv(data, res);
  }

  @Get(':id')
  @RequirePermissions('audit_log.view')
  async findOne(@Param('id') id: string) {
    const log = await this.auditLogService.findById(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
