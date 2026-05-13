import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment.dto';
import { CreatePaymentIntentTourDto } from './dto/create-payment-tour.dto';
import { stripe } from 'src/stripe.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Client · Payments')
@UseGuards(JwtAuthGuard)
@Controller('client/payments')
export class PaymentClientController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @ApiOperation({ summary: 'Create Stripe payment intent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @Post('create-intent')
  async createIntent(
    @Body() body: CreatePaymentIntentDto,
    @Headers('idempotency-key') key: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!key) {
      throw new DomainException('Idempotency-Key is required', 400, 'BAD_REQUEST', 'payment.bad_request');
    }

    return this.idempotencyService.execute(
      key,
      String(userId ?? ''),
      'POST /api/v1/client/payments/create-intent',
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
  @Post('create-intent/tour')
  async createIntentTour(
    @Body() body: CreatePaymentIntentTourDto,
    @Headers('idempotency-key') key: string,
    @Req() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId;
    if (!key) {
      throw new DomainException('Idempotency-Key is required', 400, 'BAD_REQUEST', 'payment.bad_request');
    }

    return this.idempotencyService.execute(
      key,
      String(userId ?? ''),
      'POST /api/v1/client/payments/create-intent/tour',
      () => this.paymentService.createPaymentIntentForTour(body.tourBookingId),
    );
  }

  @ApiOperation({ summary: 'Get payment status by tour booking ID' })
  @ApiParam({
    name: 'tourBookingId',
    description: 'Tour booking MongoDB ObjectId',
  })
  @ApiResponse({ status: 400, description: 'Invalid tourBookingId' })
  @Get('status/tour/:tourBookingId')
  async getPaymentStatusByTourBooking(
    @Param('tourBookingId') tourBookingId: string,
  ) {
    return this.paymentService.getPaymentStatusByTourBookingId(tourBookingId);
  }

  @ApiOperation({ summary: 'Get payment status by booking ID (room)' })
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
  @Get('booking/:bookingId')
  async getPaymentByBookingId(@Param('bookingId') bookingId: string) {
    return this.paymentService.getPaymentByBookingId(bookingId);
  }

  @ApiOperation({ summary: 'Get payment details by tour booking ID' })
  @ApiParam({
    name: 'tourBookingId',
    description: 'Tour booking MongoDB ObjectId',
  })
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
  @Get(':paymentId')
  async getPaymentById(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentById(paymentId);
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
  @Post('refund')
  refund(
    @Body('bookingId') bookingId: string,
    @Body('amount') amount?: number,
  ) {
    return this.paymentService.refund(bookingId, amount);
  }
}
