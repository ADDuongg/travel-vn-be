import { Controller, Headers, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';

/**
 * Mounted at `/payments/*` — excluded from `api/v1` global prefix (see main.ts).
 * Webhook expects raw body; middleware applied in main.ts on `/payments/webhook/stripe`.
 */
@ApiTags('Payments · Webhook')
@Controller('payments')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @SkipThrottle()
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received successfully',
  })
  @Post('webhook/stripe')
  async stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload =
      typeof req.body === 'string'
        ? Buffer.from(req.body)
        : (req.body as Buffer);
    await this.paymentService.handleStripeWebhook(signature, payload);
    return { received: true };
  }
}
