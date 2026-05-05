import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schema/payment.schema';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  createNew(doc: Partial<Payment>): PaymentDocument {
    return new this.paymentModel(doc);
  }

  async save(payment: PaymentDocument): Promise<PaymentDocument> {
    return payment.save();
  }

  async findOneByIntentId(intentId: string) {
    return this.paymentModel.findOne({ intentId }).exec();
  }

  async findSucceededBefore(date: Date) {
    return this.paymentModel.find({
      status: PaymentStatus.SUCCEEDED,
      createdAt: { $lt: date },
    });
  }

  async findOneByBookingId(bookingId: Types.ObjectId) {
    return this.paymentModel.findOne({ bookingId }).lean().exec();
  }

  async findLatestByTourBookingId(tourBookingId: Types.ObjectId) {
    return this.paymentModel
      .findOne({ tourBookingId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findByIdLean(paymentId: Types.ObjectId) {
    return this.paymentModel.findById(paymentId).lean().exec();
  }

  async findStatusByBookingId(bookingId: Types.ObjectId) {
    return this.paymentModel
      .findOne({ bookingId })
      .select('status amount currency refundedAmount createdAt')
      .lean()
      .exec();
  }

  async findStatusByTourBookingId(tourBookingId: Types.ObjectId) {
    return this.paymentModel
      .findOne({ tourBookingId })
      .sort({ createdAt: -1 })
      .select('status amount currency refundedAmount createdAt')
      .lean()
      .exec();
  }

  async findRefundableByBookingId(bookingId: Types.ObjectId) {
    return this.paymentModel.findOne({
      bookingId,
      status: {
        $in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED],
      },
    });
  }

  async findPendingOlderThan(date: Date) {
    return this.paymentModel
      .find({
        status: PaymentStatus.PENDING,
        createdAt: { $lt: date },
      })
      .select('_id')
      .lean()
      .exec();
  }

  async expirePendingOlderThan(date: Date): Promise<void> {
    await this.paymentModel.updateMany(
      {
        status: PaymentStatus.PENDING,
        createdAt: { $lt: date },
      },
      { status: PaymentStatus.EXPIRED },
    );
  }
}
