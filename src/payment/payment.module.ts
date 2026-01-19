import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schema/payment.schema';
import { Order, OrderSchema } from '../orders/schema/order.schema';
import { PaymentExpireService } from './payment-expire.service';
import { BookingModule } from 'src/booking/booking.module';
import { IdempotencyModule } from 'src/idempotency/idempotency.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    BookingModule,
    IdempotencyModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentExpireService],
})
export class PaymentModule {}
