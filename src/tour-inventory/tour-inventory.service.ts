import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseDateOnly } from 'src/utils/date.util';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import {
  TourInventory,
  TourInventoryDocument,
  TourInventoryStatus,
} from './schema/tour-inventory.schema';
import { BlockSlotsDto } from './dto/block-slots.dto';
import { ReleaseSlotsDto } from './dto/release-slots.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationEvent,
} from 'src/notification/notification.constants';
import { TourInventoryNotificationEvent } from 'src/notification/events/tour-inventory-notification.event';

@Injectable()
export class TourInventoryService {
  constructor(
    @InjectModel(TourInventory.name)
    private readonly inventoryModel: Model<TourInventoryDocument>,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private updateInventoryStatus(inv: TourInventoryDocument): void {
    if (inv.status === TourInventoryStatus.CANCELLED) return;
    if (inv.availableSlots <= 0) {
      inv.status = TourInventoryStatus.FULL;
    } else if (inv.availableSlots <= Math.ceil(inv.totalSlots * 0.2)) {
      inv.status = TourInventoryStatus.LIMITED;
    } else {
      inv.status = TourInventoryStatus.AVAILABLE;
    }
  }

  /**
   * Lấy danh sách availability theo tháng (YYYY-MM)
   * GET /api/v1/tours/:id/availability?month=2025-03
   */
  async getAvailabilityByMonth(
    tourId: string,
    month: string,
  ): Promise<
    Array<{
      departureDate: string;
      availableSlots: number;
      totalSlots: number;
      status: TourInventoryStatus;
      specialPrice?: number;
      currency: string;
    }>
  > {
    if (!Types.ObjectId.isValid(tourId)) {
      throw new BadRequestException('Invalid tour ID');
    }

    const [year, monthNum] = month.split('-').map(Number);
    console.log(year, monthNum);
    console.log('month', month);

    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Invalid month format (use YYYY-MM)');
    }

    const start = new Date(Date.UTC(year, monthNum - 1, 1));
    const end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    const list = await this.inventoryModel
      .find({
        tourId: new Types.ObjectId(tourId),
        departureDate: { $gte: start, $lte: end },
        status: { $ne: TourInventoryStatus.CANCELLED },
      })
      .sort({ departureDate: 1 })
      .lean();

    return list.map((inv) => ({
      departureDate: (inv.departureDate as Date).toISOString().slice(0, 10),
      availableSlots: inv.availableSlots,
      totalSlots: inv.totalSlots,
      status: inv.status,
      specialPrice: inv.specialPrice,
      currency: inv.currency ?? 'VND',
    }));
  }

  /**
   * Block (giảm) số chỗ khi có booking
   */
  async blockSlots(dto: BlockSlotsDto): Promise<TourInventoryDocument> {
    const departureDate = parseDateOnly(dto.departureDate);
    const tourId = new Types.ObjectId(dto.tourId);

    const inv = await this.inventoryModel.findOne({
      tourId,
      departureDate,
    });

    if (!inv) {
      throw new NotFoundException(
        'Tour inventory not found for this tour and departure date',
      );
    }

    if (inv.status === TourInventoryStatus.CANCELLED) {
      throw new BadRequestException('This departure is cancelled');
    }

    if (inv.availableSlots < dto.slots) {
      throw new BadRequestException(
        `Not enough slots. Available: ${inv.availableSlots}, requested: ${dto.slots}`,
      );
    }

    const prevStatus = inv.status;
    inv.availableSlots -= dto.slots;
    this.updateInventoryStatus(inv);

    if (prevStatus !== inv.status) {
      const event = new TourInventoryNotificationEvent(
        String(inv.tourId),
        (departureDate as Date).toISOString().slice(0, 10),
        inv.totalSlots,
        inv.availableSlots,
      );

      if (inv.status === TourInventoryStatus.FULL) {
        this.eventEmitter.emit(NotificationEvent.TOUR_INVENTORY_SOLD_OUT, event);
      } else if (inv.status === TourInventoryStatus.LIMITED) {
        this.eventEmitter.emit(NotificationEvent.TOUR_INVENTORY_LOW, event);
      }
    }

    return inv.save();
  }

  /**
   * Release (trả lại) số chỗ khi cancel booking
   */
  async releaseSlots(dto: ReleaseSlotsDto): Promise<TourInventoryDocument> {
    const departureDate = parseDateOnly(dto.departureDate);
    const tourId = new Types.ObjectId(dto.tourId);

    const inv = await this.inventoryModel.findOne({
      tourId,
      departureDate,
    });

    if (!inv) {
      throw new NotFoundException(
        'Tour inventory not found for this tour and departure date',
      );
    }

    const prevStatus = inv.status;
    inv.availableSlots = Math.min(
      inv.totalSlots,
      inv.availableSlots + dto.slots,
    );
    this.updateInventoryStatus(inv);

    if (prevStatus !== inv.status) {
      const event = new TourInventoryNotificationEvent(
        String(inv.tourId),
        (departureDate as Date).toISOString().slice(0, 10),
        inv.totalSlots,
        inv.availableSlots,
      );

      if (prevStatus === TourInventoryStatus.FULL) {
        this.eventEmitter.emit(
          NotificationEvent.TOUR_INVENTORY_RESTOCKED,
          event,
        );
      } else if (
        prevStatus === TourInventoryStatus.LIMITED &&
        inv.status === TourInventoryStatus.AVAILABLE
      ) {
        this.eventEmitter.emit(
          NotificationEvent.TOUR_INVENTORY_RESTOCKED,
          event,
        );
      }
    }

    return inv.save();
  }

  /**
   * Đảm bảo có bản ghi inventory cho tour + ngày khởi hành (Admin tạo slot)
   */
  async ensureInventory(
    tourId: string,
    departureDate: string,
    totalSlots: number,
    specialPrice?: number,
  ): Promise<TourInventoryDocument> {
    if (!Types.ObjectId.isValid(tourId)) {
      throw new BadRequestException('Invalid tour ID');
    }

    const tour = await this.tourModel.findById(tourId);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const date = parseDateOnly(departureDate);
    if (date.getTime() < Date.now()) {
      throw new BadRequestException('Departure date must be in the future');
    }

    const maxGuests = tour.capacity?.maxGuests ?? 100;
    if (totalSlots < 1 || totalSlots > maxGuests) {
      throw new BadRequestException(
        `totalSlots must be between 1 and ${maxGuests}`,
      );
    }

    let inv = await this.inventoryModel.findOne({
      tourId: new Types.ObjectId(tourId),
      departureDate: date,
    });

    if (inv) {
      const booked = inv.totalSlots - inv.availableSlots;
      if (totalSlots < booked) {
        throw new BadRequestException(
          `Cannot set totalSlots below already booked (${booked})`,
        );
      }
      inv.totalSlots = totalSlots;
      inv.availableSlots = totalSlots - booked;
      if (specialPrice !== undefined) inv.specialPrice = specialPrice;
      this.updateInventoryStatus(inv);
      return inv.save();
    }

    inv = await this.inventoryModel.create({
      tourId: new Types.ObjectId(tourId),
      departureDate: date,
      totalSlots,
      availableSlots: totalSlots,
      status: TourInventoryStatus.AVAILABLE,
      specialPrice,
      currency: tour.pricing?.currency ?? 'VND',
    });
    return inv;
  }

  /**
   * Lấy 1 inventory theo tour + ngày (dùng trong TourBookingService)
   */
  async getByTourAndDate(
    tourId: Types.ObjectId,
    departureDate: Date,
  ): Promise<TourInventoryDocument | null> {
    const date = parseDateOnly(departureDate);
    return this.inventoryModel.findOne({
      tourId,
      departureDate: date,
      status: { $ne: TourInventoryStatus.CANCELLED },
    });
  }

  /**
   * Kiểm tra còn đủ chỗ không
   */
  async canBook(
    tourId: Types.ObjectId,
    departureDate: Date,
    slots: number,
  ): Promise<boolean> {
    const inv = await this.getByTourAndDate(tourId, departureDate);
    return !!inv && inv.availableSlots >= slots;
  }
}
