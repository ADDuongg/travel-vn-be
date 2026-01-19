import { Controller, Get, Param, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schema/order.schema';
import { Payment, PaymentDocument } from 'src/payment/schema/payment.schema';

@Controller('orders')
export class OrdersController {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  @Post('create')
  async createOrder() {
    const order = await this.orderModel.create({
      amount: 100000,
      currency: 'vnd',
      status: OrderStatus.CREATED,
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    };
  }

  @Get(':orderId/payments/timeline')
  async getPaymentTimeline(@Param('orderId') orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const payments = await this.paymentModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .sort({ createdAt: 1 })
      .lean();

    const timeline = payments.map((p: any) => ({
      paymentId: p._id,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      createdAt: p.createdAt,
      events: (p.rawEvents || []).map((e: any) => ({
        id: e.id,
        type: e.type,
        at: new Date(e.created * 1000),
      })),
    }));

    return {
      orderId: order._id,
      orderStatus: order.status,
      timeline,
    };
  }
}
