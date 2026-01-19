import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Request } from 'express';
import { CreatePaymentIntentDto } from './dto/create-payment.dto';
import { stripe } from 'src/stripe.service';
import { ApiBody } from '@nestjs/swagger';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly idempotencyService: IdempotencyService,
  ) {}
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          example: 'pi_3SofJMCW6g1ecNOk10nFl0NL',
          description: 'MongoDB ObjectId of the order',
        },
      },
      required: ['paymentIntentId'],
    },
  })
  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  async createIntent(
    @Body() body: CreatePaymentIntentDto,
    @Headers('idempotency-key') key: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    if (!key) {
      throw new BadRequestException('Idempotency-Key is required');
    }

    return this.idempotencyService.execute(
      key,
      userId, // hoặc req.user.id tuỳ auth
      'POST /payments/create-intent',
      () => this.paymentService.createPaymentIntent(body.bookingId),
    );
  }

  @Post('webhook/stripe')
  async stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentService.handleStripeWebhook(signature, req.body);

    return { received: true };
  }

  /* test */
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: {
          type: 'string',
          example: 'pi_3SofJMCW6g1ecNOk10nFl0NL',
          description: 'MongoDB ObjectId of the order',
        },
      },
      required: ['paymentIntentId'],
    },
  })
  @Post('confirm')
  async confirm(@Body('paymentIntentId') id: string) {
    return stripe.paymentIntents.confirm(id, {
      payment_method: 'pm_card_visa',
      // payment_method: 'pm_card_chargeDeclined',
      /* return_url là đường dẫn đến trang web chứa kết quả thanh toán cho FE */
      return_url: 'http://localhost:3000/payment-result',
    });
  }

  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          example: 'pi_3SofJMCW6g1ecNOk10nFl0NL',
          description: 'MongoDB ObjectId of the order',
        },
        amount: {
          type: 'number',
          example: 1000,
          description: 'Amount to refund',
        },
      },
      required: ['paymentIntentId'],
    },
  })
  @Post('refund')
  refund(
    @Body('bookingId') bookingId: string,
    @Body('amount') amount?: number,
  ) {
    return this.paymentService.refund(bookingId, amount);
  }
}
