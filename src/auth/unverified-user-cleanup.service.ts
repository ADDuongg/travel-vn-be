import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { subDays } from 'date-fns';

import { User, UserDocument } from 'src/user/schema/user.schema';
import { EnvService } from 'src/env/env.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import {
  AuditCategory,
  AuditResourceType,
  AuthAuditAction,
} from 'src/audit-log/enums/audit-log.enum';

/**
 * Soft-delete accounts that never completed email verification (self-registration).
 */
@Injectable()
export class UnverifiedUserCleanupService {
  private readonly logger = new Logger(UnverifiedUserCleanupService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly env: EnvService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeStaleUnverifiedUsers() {
    const ttlDays = this.env.get('UNVERIFIED_USER_TTL_DAYS', 7);
    const cutoff = subDays(new Date(), ttlDays);

    const result = await this.userModel.updateMany(
      {
        isEmailVerified: false,
        isSuperAdmin: { $ne: true },
        deletedAt: { $exists: false },
        createdAt: { $lt: cutoff },
      },
      {
        $set: {
          deletedAt: new Date(),
          isActive: false,
        },
      },
    );

    const n = result.modifiedCount ?? 0;
    if (n > 0) {
      this.logger.log(
        `Unverified user purge: soft-deleted ${n} account(s) (created before ${cutoff.toISOString()})`,
      );
      this.auditLogService.log({
        category: AuditCategory.AUTH,
        action: AuthAuditAction.UNVERIFIED_USER_PURGED,
        resourceType: AuditResourceType.USER,
        metadata: { modifiedCount: n, cutoff: cutoff.toISOString() },
      });
    }
  }
}
