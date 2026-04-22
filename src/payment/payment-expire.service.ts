import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schema/payment.schema';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import {
  AuditCategory,
  AuditResourceType,
  PaymentAuditAction,
} from 'src/audit-log/enums/audit-log.enum';

@Injectable()
export class PaymentExpireService {
  private readonly logger = new Logger(PaymentExpireService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron('*/15 * * * *')
  async expirePendingPayments() {
    const expireBefore = new Date(Date.now() - 15 * 60 * 1000);

    const expiredPayments = await this.paymentModel
      .find({
        status: PaymentStatus.PENDING,
        createdAt: { $lt: expireBefore },
      })
      .select('_id')
      .lean();

    if (!expiredPayments.length) return;

    await this.paymentModel.updateMany(
      {
        status: PaymentStatus.PENDING,
        createdAt: { $lt: expireBefore },
      },
      { status: PaymentStatus.EXPIRED },
    );

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
