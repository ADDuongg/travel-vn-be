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
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/role.guard';
import { Roles } from 'src/guards/role.guard';
import { AuditLogService } from './audit-log.service';
import { AuditLogExportService } from './audit-log-export.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogExportQueryDto } from './dto/audit-log-export-query.dto';

@Controller('api/v1/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditLogExportService: AuditLogExportService,
  ) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }

  @Get('export')
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
  async findOne(@Param('id') id: string) {
    const log = await this.auditLogService.findById(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
