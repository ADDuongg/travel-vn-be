import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLogRepository } from './audit-log.repository';
import { AuditCategory } from './enums/audit-log.enum';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuditLogCleanupService {
  private readonly logger = new Logger(AuditLogCleanupService.name);

  private readonly retentionDays: Record<AuditCategory, number> = {
    [AuditCategory.PAYMENT]: 730,
    [AuditCategory.AUTH]: 365,
    [AuditCategory.CRUD]: 90,
  };

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredAuditLogs() {
    for (const category of Object.values(AuditCategory)) {
      const days = this.retentionDays[category];
      const cutoff = new Date(Date.now() - days * DAY_MS);
      const deleted = await this.auditLogRepository.deleteExpired(
        category,
        cutoff,
      );

      if (deleted > 0) {
        this.logger.log(
          `Audit cleanup [${category}]: deleted ${deleted} log(s) older than ${days} days (cutoff=${cutoff.toISOString()})`,
        );
      }
    }
  }
}

