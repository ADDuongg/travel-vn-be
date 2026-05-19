import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentStatus } from './schema/payment.schema';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import {
  AuditCategory,
  AuditResourceType,
  PaymentAuditAction,
} from 'src/audit-log/enums/audit-log.enum';
import { PaymentRepository } from './payment.repository';

@Injectable()
export class PaymentExpireService {
  private readonly logger = new Logger(PaymentExpireService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron('*/15 * * * *')
  async expirePendingPayments() {
    const expireBefore = new Date(Date.now() - 15 * 60 * 1000);

    const expiredPayments =
      await this.paymentRepository.findPendingOlderThan(expireBefore);

    if (!expiredPayments.length) return;

    await this.paymentRepository.expirePendingOlderThan(expireBefore);

    this.logger.log(`Expired ${expiredPayments.length} payments`);

    for (const payment of expiredPayments) {
      this.auditLogService.log({
        category: AuditCategory.PAYMENT,
        action: PaymentAuditAction.PAYMENT_EXPIRED,
        resourceType: AuditResourceType.PAYMENT,
        resourceId: payment._id,
        oldValue: { status: PaymentStatus.PENDING },
        newValue: { status: PaymentStatus.EXPIRED },
        description: 'Auto-expired by cron',
      });
    }
  }
}
