import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schema/audit-log.schema';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { AuditLogExportService } from './audit-log-export.service';
import { AuditLogController } from './audit-log.controller';
import { CrudAuditInterceptor } from './interceptors/crud-audit.interceptor';
import { AuditLogCleanupService } from './audit-log-cleanup.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditLogController],
  providers: [
    AuditLogRepository,
    AuditLogService,
    AuditLogExportService,
    CrudAuditInterceptor,
    AuditLogCleanupService,
  ],
  exports: [AuditLogService, CrudAuditInterceptor],
})
export class AuditLogModule {}
