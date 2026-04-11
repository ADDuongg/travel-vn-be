import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { Request } from 'express';
import { CreatePaymentIntentDto } from './dto/create-payment.dto';
import { CreatePaymentIntentTourDto } from './dto/create-payment-tour.dto';
import { stripe } from 'src/stripe.service';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @ApiOperation({ summary: 'Create Stripe payment intent' })
  /* @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          example: '507f1f77bcf86cd799439011',
          description: 'MongoDB ObjectId of the booking',
        },
      },
      required: ['bookingId'],
    },
  }) */
  /* @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    schema: {
      type: 'object',
      properties: {
        clientSecret: {
          type: 'string',
          example: 'pi_3SofJMCW6g1ecNOk10nFl0NL_secret_xxx',
        },
        paymentId: {
          type: 'string',
          example: '507f1f77bcf86cd799439011',
        },
      },
    },
  }) */
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
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
      String(userId ?? ''),
      'POST /payments/create-intent',
      () => this.paymentService.createPaymentIntent(body.bookingId),
    );
  }

  @ApiOperation({ summary: 'Create Stripe payment intent for tour booking' })
  @ApiResponse({
    status: 201,
    description: 'Returns clientSecret and paymentId',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request / Tour booking already paid',
  })
  @ApiResponse({ status: 404, description: 'Tour booking not found' })
  @UseGuards(JwtAuthGuard)
  @Post('create-intent/tour')
  async createIntentTour(
    @Body() body: CreatePaymentIntentTourDto,
    @Headers('idempotency-key') key: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    if (!key) {
      throw new BadRequestException('Idempotency-Key is required');
    }

    return this.idempotencyService.execute(
      key,
      String(userId ?? ''),
      'POST /payments/create-intent/tour',
      () => this.paymentService.createPaymentIntentForTour(body.tourBookingId),
    );
  }

  @ApiOperation({ summary: 'Get payment status by booking ID' })
  @ApiParam({
    name: 'bookingId',
    description: 'MongoDB ObjectId of the booking',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        status: {
          type: 'string',
          enum: [
            'PENDING',
            'SUCCEEDED',
            'FAILED',
            'REFUNDED',
            'FULLY_REFUNDED',
            'EXPIRED',
            'CANCELLED',
          ],
          nullable: true,
        },
        amount: { type: 'number', nullable: true },
        currency: { type: 'string', nullable: true },
        refundedAmount: { type: 'number', nullable: true },
        createdAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiOperation({ summary: 'Get payment status by tour booking ID' })
  @ApiParam({
    name: 'tourBookingId',
    description: 'Tour booking MongoDB ObjectId',
  })
  @ApiResponse({ status: 400, description: 'Invalid tourBookingId' })
  @UseGuards(JwtAuthGuard)
  @Get('status/tour/:tourBookingId')
  async getPaymentStatusByTourBooking(
    @Param('tourBookingId') tourBookingId: string,
  ) {
    return this.paymentService.getPaymentStatusByTourBookingId(tourBookingId);
  }

  @ApiOperation({ summary: 'Get payment status by booking ID (room)' })
  @UseGuards(JwtAuthGuard)
  @Get('status/:bookingId')
  async getPaymentStatus(@Param('bookingId') bookingId: string) {
    return this.paymentService.getPaymentStatus(bookingId);
  }

  @ApiOperation({ summary: 'Get payment details by booking ID' })
  @ApiParam({
    name: 'bookingId',
    description: 'MongoDB ObjectId of the booking',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @UseGuards(JwtAuthGuard)
  @Get('booking/:bookingId')
  async getPaymentByBookingId(@Param('bookingId') bookingId: string) {
    return this.paymentService.getPaymentByBookingId(bookingId);
  }

  @ApiOperation({ summary: 'Get payment details by tour booking ID' })
  @ApiParam({
    name: 'tourBookingId',
    description: 'Tour booking MongoDB ObjectId',
  })
  @UseGuards(JwtAuthGuard)
  @Get('tour-booking/:tourBookingId')
  async getPaymentByTourBookingId(
    @Param('tourBookingId') tourBookingId: string,
  ) {
    return this.paymentService.getPaymentByTourBookingId(tourBookingId);
  }

  @ApiOperation({ summary: 'Get payment details by payment ID' })
  @ApiParam({
    name: 'paymentId',
    description: 'MongoDB ObjectId of the payment',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @UseGuards(JwtAuthGuard)
  @Get(':paymentId')
  async getPaymentById(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentById(paymentId);
  }

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

  @ApiOperation({ summary: 'Test endpoint - Confirm payment intent' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: {
          type: 'string',
          example: 'pi_3SofJMCW6g1ecNOk10nFl0NL',
          description: 'Stripe Payment Intent ID',
        },
        returnUrl: {
          type: 'string',
          example: 'http://localhost:5173/payment-result',
          description: 'Frontend return URL after payment',
        },
      },
      required: ['paymentIntentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Payment intent confirmed' })
  @Post('confirm')
  async confirm(
    @Body('paymentIntentId') id: string,
    @Body('returnUrl') returnUrl?: string,
  ) {
    return stripe.paymentIntents.confirm(id, {
      payment_method: 'pm_card_visa',
      // payment_method: 'pm_card_chargeDeclined',
      /* return_url là đường dẫn đến trang web chứa kết quả thanh toán cho FE */
      return_url: returnUrl || 'http://localhost:5173/payment-result',
    });
  }

  @ApiOperation({ summary: 'Refund a payment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          example: '507f1f77bcf86cd799439011',
          description: 'MongoDB ObjectId of the booking',
        },
        amount: {
          type: 'number',
          example: 1000,
          description: 'Amount to refund (optional, defaults to full refund)',
        },
      },
      required: ['bookingId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseGuards(JwtAuthGuard)
  @Post('refund')
  refund(
    @Body('bookingId') bookingId: string,
    @Body('amount') amount?: number,
  ) {
    return this.paymentService.refund(bookingId, amount);
  }
}
