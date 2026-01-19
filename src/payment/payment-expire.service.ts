// payment-expire.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schema/payment.schema';

@Injectable()
export class PaymentExpireService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  @Cron('*/15 * * * *')
  async expirePendingPayments() {
    const expireBefore = new Date(Date.now() - 15 * 60 * 1000);

    const result = await this.paymentModel.updateMany(
      {
        status: PaymentStatus.PENDING,
        createdAt: { $lt: expireBefore },
      },
      {
        status: PaymentStatus.EXPIRED,
      },
    );

    if (result.modifiedCount > 0) {
      console.log(`⏰ Expired ${result.modifiedCount} payments`);
    }
  }
}
