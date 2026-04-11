import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { parseDateOnly } from 'src/utils/date.util';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import { TourInventoryService } from 'src/tour-inventory/tour-inventory.service';
import {
  TourInventory,
  TourInventoryDocument,
} from 'src/tour-inventory/schema/tour-inventory.schema';
import {
  TourGuide,
  TourGuideDocument,
} from 'src/tour-guide/schema/tour-guide.schema';
import {
  TourBooking,
  TourBookingDocument,
  TourBookingStatus,
  TourPaymentStatus,
} from './schema/tour-booking.schema';
import { CreateTourBookingDto } from './dto/create-tour-booking.dto';
import { PaymentTourBookingDto } from './dto/payment-tour-booking.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvent } from 'src/notification/notification.constants';
import { TourBookingNotificationEvent } from 'src/notification/events/tour-booking-notification.event';

@Injectable()
export class TourBookingService {
  constructor(
    @InjectModel(TourBooking.name)
    private readonly bookingModel: Model<TourBookingDocument>,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    @InjectModel(TourInventory.name)
    private readonly inventoryModel: Model<TourInventoryDocument>,
    @InjectModel(TourGuide.name)
    private readonly tourGuideModel: Model<TourGuideDocument>,
    private readonly tourInventoryService: TourInventoryService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async generateBookingCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = 'TB-' + randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.bookingModel.findOne({ bookingCode: code });
      if (!exists) return code;
    }
    return 'TB-' + Date.now().toString(36).toUpperCase();
  }

  private applySale(
    basePrice: number,
    sale?: {
      isActive?: boolean;
      type?: string;
      value?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    if (!sale?.isActive || !sale?.type) return basePrice;
    const now = new Date();
    if (sale.startDate && new Date(sale.startDate) > now) return basePrice;
    if (sale.endDate && new Date(sale.endDate) < now) return basePrice;
    if (sale.type === 'PERCENT') {
      return Math.max(0, Math.round(basePrice * (1 - (sale.value ?? 0) / 100)));
    }
    if (sale.type === 'FIXED') {
      return Math.max(0, basePrice - (sale.value ?? 0));
    }
    return basePrice;
  }

  /**
   * Tính tổng tiền: adults * price + children * childPrice + infants * infantPrice
   */
  private calculateAmount(
    tour: TourDocument,
    inventory: TourInventoryDocument | null,
    adults: number,
    children: number,
    infants: number,
  ): { totalAmount: number; currency: string } {
    const pricing = tour.pricing;
    const currency = pricing?.currency ?? 'VND';
    const basePrice = inventory?.specialPrice ?? pricing?.basePrice ?? 0;
    const pricePerAdult = this.applySale(basePrice, tour.sale);
    const childPrice = pricing?.childPrice ?? Math.round(pricePerAdult * 0.7);
    const infantPrice = pricing?.infantPrice ?? 0;

    const totalAmount =
      adults * pricePerAdult +
      (children ?? 0) * childPrice +
      (infants ?? 0) * infantPrice;

    return { totalAmount, currency };
  }

  async create(
    dto: CreateTourBookingDto,
    userId: string,
  ): Promise<TourBooking> {
    const tourId = new Types.ObjectId(dto.tourId);
    const departureDate = parseDateOnly(dto.departureDate);

    const tour = await this.tourModel.findById(tourId);
    if (!tour) throw new NotFoundException('Tour not found');

    const inventory = await this.tourInventoryService.getByTourAndDate(
      tourId,
      departureDate,
    );
    if (!inventory) {
      throw new BadRequestException(
        'No availability for this tour on the selected date',
      );
    }

    const totalGuests = dto.adults + (dto.children ?? 0) + (dto.infants ?? 0);
    if (totalGuests < (tour.capacity?.minGuests ?? 1)) {
      throw new BadRequestException(
        `Minimum ${tour.capacity?.minGuests ?? 1} guest(s) required`,
      );
    }
    if (inventory.availableSlots < totalGuests) {
      throw new BadRequestException(
        `Not enough slots. Available: ${inventory.availableSlots}, requested: ${totalGuests}`,
      );
    }

    const { totalAmount, currency } = this.calculateAmount(
      tour as TourDocument,
      inventory,
      dto.adults,
      dto.children ?? 0,
      dto.infants ?? 0,
    );

    const bookingConfig = tour.bookingConfig ?? {};
    const depositPercent = bookingConfig.requireDeposit
      ? (bookingConfig.depositPercent ?? 30)
      : 0;
    const depositAmount = Math.round((totalAmount * depositPercent) / 100);

    const bookingCode = await this.generateBookingCode();

    await this.tourInventoryService.blockSlots({
      tourId: dto.tourId,
      departureDate: dto.departureDate,
      slots: totalGuests,
    });

    const bookingPayload: any = {
      bookingCode,
      tourId,
      tourInventoryId: inventory._id,
      userId: new Types.ObjectId(userId),
      guest: {
        fullName: dto.guest.fullName,
        email: dto.guest.email,
        phone: dto.guest.phone,
        note: dto.guest.note,
      },
      adults: dto.adults,
      children: dto.children ?? 0,
      infants: dto.infants ?? 0,
      departureDate,
      totalAmount,
      currency,
      depositAmount,
      paidAmount: 0,
      status: TourBookingStatus.PENDING,
      paymentStatus: TourPaymentStatus.UNPAID,
    };

    if (dto.guideId && Types.ObjectId.isValid(dto.guideId)) {
      bookingPayload.guideId = new Types.ObjectId(dto.guideId);
    }

    const booking = await this.bookingModel.create(bookingPayload);

    const viName = (tour.translations as any)?.vi?.name;
    const enName = (tour.translations as any)?.en?.name;
    const tourName = viName || enName;

    this.eventEmitter.emit(
      NotificationEvent.TOUR_BOOKING_CREATED,
      new TourBookingNotificationEvent(
        String(booking._id),
        booking.bookingCode,
        String(tour._id),
        tourName,
      ),
    );

    return booking.populate([
      { path: 'tourId', select: 'code slug translations duration pricing' },
    ]);
  }

  async getByCode(code: string): Promise<TourBooking> {
    const booking = await this.bookingModel
      .findOne({ bookingCode: code.toUpperCase() })
      .populate('tourId', 'code slug translations duration pricing capacity')
      .populate(
        'tourInventoryId',
        'departureDate totalSlots availableSlots status',
      )
      .lean();

    if (!booking) throw new NotFoundException('Booking not found');
    return booking as TourBooking;
  }

  async getById(id: string): Promise<TourBooking> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid booking ID');
    }
    const booking = await this.bookingModel
      .findById(id)
      .populate('tourId', 'code slug translations duration pricing capacity')
      .populate(
        'tourInventoryId',
        'departureDate totalSlots availableSlots status',
      )
      .exec();

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getMyBookings(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    items: TourBooking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      paymentStatus: { $ne: TourPaymentStatus.EXPIRED },
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('tourId', 'code slug translations duration')
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);

    return {
      items: items as TourBooking[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getByCodeForUser(userId: string, code: string): Promise<TourBooking> {
    const booking = await this.bookingModel
      .findOne({
        bookingCode: code.toUpperCase(),
        userId: new Types.ObjectId(userId),
      })
      .populate('tourId', 'code slug translations duration pricing capacity')
      .populate('tourInventoryId', 'departureDate totalSlots status')
      .exec();

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async confirm(id: string): Promise<TourBooking> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== TourBookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be confirmed');
    }
    booking.status = TourBookingStatus.CONFIRMED;
    const saved = await booking.save();

    const populated = await saved.populate('tourId', 'translations');
    const viName = (populated.tourId as any)?.translations?.vi?.name;
    const enName = (populated.tourId as any)?.translations?.en?.name;
    const tourName = viName || enName;

    this.eventEmitter.emit(
      NotificationEvent.TOUR_BOOKING_CONFIRMED,
      new TourBookingNotificationEvent(
        String(saved._id),
        saved.bookingCode,
        String(saved.tourId),
        tourName,
      ),
    );

    return saved;
  }

  /**
   * Hủy đơn. Chỉ chủ đơn (booking.userId === userId) hoặc admin mới được hủy.
   */
  async cancel(
    id: string,
    reason?: string,
    userId?: string,
    role?: string,
    roles?: string[],
  ): Promise<TourBooking> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');

    const isOwner = booking.userId && String(booking.userId) === userId;
    const isAdmin =
      role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Only the booking owner or admin can cancel this booking',
      );
    }

    if (
      booking.status === TourBookingStatus.CANCELLED ||
      booking.status === TourBookingStatus.COMPLETED
    ) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    const totalGuests = booking.adults + booking.children + booking.infants;
    const inv = await this.inventoryModel.findById(booking.tourInventoryId);
    if (inv) {
      await this.tourInventoryService.releaseSlots({
        tourId: String(booking.tourId),
        departureDate: inv.departureDate.toISOString().slice(0, 10),
        slots: totalGuests,
      });
    }

    booking.status = TourBookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelReason = reason;
    const saved = await booking.save();

    const populated = await saved.populate('tourId', 'translations');
    const viName = (populated.tourId as any)?.translations?.vi?.name;
    const enName = (populated.tourId as any)?.translations?.en?.name;
    const tourName = viName || enName;

    this.eventEmitter.emit(
      NotificationEvent.TOUR_BOOKING_CANCELLED,
      new TourBookingNotificationEvent(
        String(saved._id),
        saved.bookingCode,
        String(saved.tourId),
        tourName,
      ),
    );

    return saved;
  }

  async recordPayment(
    id: string,
    dto: PaymentTourBookingDto,
  ): Promise<TourBooking> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === TourBookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay a cancelled booking');
    }

    booking.paidAmount = (booking.paidAmount ?? 0) + dto.amount;
    booking.payment = {
      provider: dto.provider,
      transactionId: dto.transactionId,
      amount: dto.amount,
      paidAt: new Date(),
    };
    if (booking.paidAmount >= booking.totalAmount) {
      booking.status = TourBookingStatus.PAID;
      booking.paymentStatus = TourPaymentStatus.PAID;
      booking.paidAt = new Date();
    } else if (booking.paidAmount >= booking.depositAmount) {
      booking.status = TourBookingStatus.CONFIRMED;
      booking.paymentStatus = TourPaymentStatus.PAID;
    }
    const saved = await booking.save();

    if (
      saved.status === TourBookingStatus.CONFIRMED ||
      saved.status === TourBookingStatus.PAID
    ) {
      const populated = await saved.populate('tourId', 'translations');
      const viName = (populated.tourId as any)?.translations?.vi?.name;
      const enName = (populated.tourId as any)?.translations?.en?.name;
      const tourName = viName || enName;

      this.eventEmitter.emit(
        NotificationEvent.TOUR_BOOKING_CONFIRMED,
        new TourBookingNotificationEvent(
          String(saved._id),
          saved.bookingCode,
          String(saved.tourId),
          tourName,
        ),
      );
    }

    return saved;
  }

  /**
   * Gọi từ Payment webhook khi Stripe payment_intent.succeeded.
   * Cập nhật paidAmount, payment (STRIPE), status PAID/CONFIRMED.
   */
  async markAsPaid(
    tourBookingId: string,
    amount: number,
    transactionId: string,
  ): Promise<TourBooking> {
    const booking = await this.bookingModel.findById(tourBookingId);
    if (!booking) throw new NotFoundException('Tour booking not found');
    if (booking.status === TourBookingStatus.CANCELLED) {
      return booking;
    }

    const newPaidAmount = (booking.paidAmount ?? 0) + amount;
    booking.paidAmount = newPaidAmount;
    booking.payment = {
      provider: 'STRIPE',
      transactionId,
      amount,
      paidAt: new Date(),
    };
    booking.paymentStatus = TourPaymentStatus.PAID;
    if (newPaidAmount >= booking.totalAmount) {
      booking.status = TourBookingStatus.PAID;
      booking.paidAt = new Date();
    } else {
      booking.status = TourBookingStatus.CONFIRMED;
    }
    const saved = await booking.save();

    if (
      saved.status === TourBookingStatus.CONFIRMED ||
      saved.status === TourBookingStatus.PAID
    ) {
      const populated = await saved.populate('tourId', 'translations');
      const viName = (populated.tourId as any)?.translations?.vi?.name;
      const enName = (populated.tourId as any)?.translations?.en?.name;
      const tourName = viName || enName;

      this.eventEmitter.emit(
        NotificationEvent.TOUR_BOOKING_CONFIRMED,
        new TourBookingNotificationEvent(
          String(saved._id),
          saved.bookingCode,
          String(saved.tourId),
          tourName,
        ),
      );
    }

    return saved;
  }

  /**
   * Gọi từ Payment webhook khi Stripe payment_intent.payment_failed.
   * Hủy đơn và release slots để người khác có thể đặt.
   */
  async markAsFailed(tourBookingId: string): Promise<TourBooking> {
    const booking = await this.bookingModel.findById(tourBookingId);
    if (!booking) throw new NotFoundException('Tour booking not found');
    if (booking.status !== TourBookingStatus.PENDING) {
      return booking;
    }

    const totalGuests = booking.adults + booking.children + booking.infants;
    const inv = await this.inventoryModel.findById(booking.tourInventoryId);
    if (inv) {
      await this.tourInventoryService.releaseSlots({
        tourId: String(booking.tourId),
        departureDate: inv.departureDate.toISOString().slice(0, 10),
        slots: totalGuests,
      });
    }

    booking.status = TourBookingStatus.CANCELLED;
    booking.paymentStatus = TourPaymentStatus.FAILED;
    booking.cancelledAt = new Date();
    booking.cancelReason = 'Payment failed';
    const saved = await booking.save();

    const populated = await saved.populate('tourId', 'translations');
    const viName = (populated.tourId as any)?.translations?.vi?.name;
    const enName = (populated.tourId as any)?.translations?.en?.name;
    const tourName = viName || enName;

    this.eventEmitter.emit(
      NotificationEvent.TOUR_BOOKING_PAYMENT_FAILED,
      new TourBookingNotificationEvent(
        String(saved._id),
        saved.bookingCode,
        String(saved.tourId),
        tourName,
      ),
    );

    return saved;
  }

  async listForAdmin(
    page: number = 1,
    limit: number = 20,
    status?: TourBookingStatus,
  ) {
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('tourId', 'code slug translations')
        .populate('tourInventoryId', 'departureDate')
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * User upload ảnh chuyển khoản (bank receipt). Chỉ đơn PENDING và chưa thanh toán đủ.
   */
  async uploadReceipt(tourBookingId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Receipt image is required');
    }

    const booking = await this.bookingModel.findById(tourBookingId);
    if (!booking) {
      throw new NotFoundException('Tour booking not found');
    }

    if (booking.status === TourBookingStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot upload receipt for cancelled booking',
      );
    }

    if (booking.status === TourBookingStatus.PAID) {
      throw new BadRequestException('Booking already paid');
    }

    const result = await this.cloudinaryService.uploadFile(file, {
      folder: `tour-bookings/${tourBookingId}/receipts`,
    });

    booking.bankReceipt = {
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    await booking.save();

    return {
      message: 'Receipt uploaded successfully',
      receipt: booking.bankReceipt,
    };
  }

  /**
   * Admin xác nhận đã nhận tiền chuyển khoản (verify receipt) → cập nhật paidAmount, status PAID.
   */
  async verifyReceipt(id: string): Promise<TourBooking> {
    const booking = await this.bookingModel.findById(id);
    if (!booking?.bankReceipt) {
      throw new BadRequestException('No receipt to verify');
    }

    if (booking.status === TourBookingStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot verify receipt for cancelled booking',
      );
    }

    booking.bankReceipt.verified = true;
    const payAmount = booking.totalAmount - (booking.paidAmount ?? 0);
    booking.paidAmount = booking.totalAmount;
    booking.payment = {
      provider: 'BANK_TRANSFER',
      transactionId: `receipt-${id}`,
      amount: payAmount,
      paidAt: new Date(),
    };
    booking.status = TourBookingStatus.PAID;
    booking.paymentStatus = TourPaymentStatus.PAID;
    booking.paidAt = new Date();

    await booking.save();
    return booking;
  }

  /**
   * Admin gán hoặc thay đổi hướng dẫn viên cho booking.
   */
  async assignGuide(bookingId: string, guideId: string): Promise<TourBooking> {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid booking ID');
    }
    if (!Types.ObjectId.isValid(guideId)) {
      throw new BadRequestException('Invalid guide ID');
    }

    const [booking, guide] = await Promise.all([
      this.bookingModel.findById(bookingId),
      this.tourGuideModel.findById(guideId),
    ]);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!guide || !guide.isActive) {
      throw new BadRequestException('Tour guide not found or inactive');
    }

    booking.guideId = guide._id as Types.ObjectId | undefined;
    await booking.save();

    return booking.populate([
      {
        path: 'tourId',
        select: 'code slug translations duration pricing',
      },
    ]);
  }
}
