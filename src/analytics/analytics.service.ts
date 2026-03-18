import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { startOfDay, subDays } from 'date-fns';
import { Model } from 'mongoose';

import {
  Booking,
  BookingDocument,
  BookingStatus,
  BookingPaymentStatus,
} from 'src/booking/schema/booking.schema';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from 'src/payment/schema/payment.schema';
import { Hotel, HotelDocument } from 'src/hotel/schema/hotel.schema';
import { Room, RoomDocument } from 'src/room/schema/room.schema';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { DashboardQueryDto, DashboardRange } from './dto/dashboard-query.dto';

export interface DashboardBookingsSummary {
  today: number;
  thisWeek: number;
  byStatus: Record<string, number>;
}

export interface DashboardRevenueSummary {
  today: number;
  thisWeek: number;
  currency: string;
}

export interface DashboardUsersSummary {
  total: number;
  newThisWeek: number;
}

export interface DashboardCatalogSummary {
  activeHotels: number;
  activeRooms: number;
  activeTours: number;
  totalUsers: number;
}

export interface DashboardOverview {
  bookings: DashboardBookingsSummary;
  revenue: DashboardRevenueSummary;
  users: DashboardUsersSummary;
  catalog: DashboardCatalogSummary;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeWithPrevious {
  current: DateRange;
  previous: DateRange;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private resolveRange(query: DashboardQueryDto): DateRangeWithPrevious {
    const now = new Date();
    const end = now;

    const range = query.range ?? DashboardRange.SEVEN_DAYS;

    if (range === DashboardRange.CUSTOM) {
      if (!query.from || !query.to) {
        throw new BadRequestException(
          'from and to are required for custom range',
        );
      }
      const start = new Date(query.from);
      const to = new Date(query.to);
      const diffMs = to.getTime() - start.getTime();
      const prevEnd = startOfDay(start);
      const prevStart = new Date(prevEnd.getTime() - diffMs);

      return {
        current: { start, end: to },
        previous: { start: prevStart, end: prevEnd },
      };
    }

    if (range === DashboardRange.TODAY) {
      const todayStart = startOfDay(now);
      const yesterdayStart = startOfDay(subDays(todayStart, 1));

      return {
        current: { start: todayStart, end },
        previous: { start: yesterdayStart, end: todayStart },
      };
    }

    const days = range === DashboardRange.THIRTY_DAYS ? 30 : 7;
    const start = startOfDay(subDays(now, days));
    const prevEnd = start;
    const prevStart = startOfDay(subDays(prevEnd, days));

    return {
      current: { start, end },
      previous: { start: prevStart, end: prevEnd },
    };
  }

  async getBookingsSummary(
    query: DashboardQueryDto,
  ): Promise<DashboardBookingsSummary> {
    const { current } = this.resolveRange(query);
    const todayStart = startOfDay(new Date());

    const [bookingsToday, bookingsThisWeek, bookingStatusAgg] =
      await Promise.all([
        this.bookingModel
          .countDocuments({
            createdAt: { $gte: todayStart },
            status: { $ne: BookingStatus.CANCELLED },
          })
          .exec(),
        this.bookingModel
          .countDocuments({
            createdAt: { $gte: current.start, $lte: current.end },
            status: { $ne: BookingStatus.CANCELLED },
          })
          .exec(),
        this.bookingModel
          .aggregate<{ _id: string; count: number }>([
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
      ]);

    const bookingStatusMap: Record<string, number> = {};
    for (const item of bookingStatusAgg) {
      bookingStatusMap[item._id] = item.count;
    }

    return {
      today: bookingsToday,
      thisWeek: bookingsThisWeek,
      byStatus: bookingStatusMap,
    };
  }

  async getRevenueSummary(
    query: DashboardQueryDto,
  ): Promise<DashboardRevenueSummary> {
    const { current } = this.resolveRange(query);
    const todayStart = startOfDay(new Date());

    const [paymentsToday, paymentsThisWeek] = await Promise.all([
      this.paymentModel
        .aggregate<{ _id: null; total: number; currency: string | null }>([
          {
            $match: {
              createdAt: { $gte: todayStart },
              status: PaymentStatus.SUCCEEDED,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              currency: { $first: '$currency' },
            },
          },
        ])
        .exec(),
      this.paymentModel
        .aggregate<{ _id: null; total: number; currency: string | null }>([
          {
            $match: {
              createdAt: { $gte: current.start, $lte: current.end },
              status: PaymentStatus.SUCCEEDED,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              currency: { $first: '$currency' },
            },
          },
        ])
        .exec(),
    ]);

    const todayRevenue = paymentsToday[0];
    const weekRevenue = paymentsThisWeek[0];

    return {
      today: todayRevenue?.total ?? 0,
      thisWeek: weekRevenue?.total ?? 0,
      currency: todayRevenue?.currency ?? weekRevenue?.currency ?? 'VND',
    };
  }

  async getUsersSummary(
    query: DashboardQueryDto,
  ): Promise<DashboardUsersSummary> {
    const { current } = this.resolveRange(query);

    const [totalUsers, newUsersThisWeek] = await Promise.all([
      this.userModel.countDocuments({}).exec(),
      this.userModel
        .countDocuments({
          createdAt: { $gte: current.start, $lte: current.end },
        })
        .exec(),
    ]);

    return {
      total: totalUsers,
      newThisWeek: newUsersThisWeek,
    };
  }

  async getCatalogSummary(): Promise<DashboardCatalogSummary> {
    const [activeHotels, activeRooms, activeTours, totalUsers] =
      await Promise.all([
        this.hotelModel.countDocuments({ isActive: true }).exec(),
        this.roomModel.countDocuments({ isActive: true }).exec(),
        this.tourModel.countDocuments({ isActive: true }).exec(),
        this.userModel.countDocuments({}).exec(),
      ]);

    return {
      activeHotels,
      activeRooms,
      activeTours,
      totalUsers,
    };
  }

  async getDashboardOverview(
    query: DashboardQueryDto,
  ): Promise<DashboardOverview> {
    const [bookings, revenue, users, catalog] = await Promise.all([
      this.getBookingsSummary(query),
      this.getRevenueSummary(query),
      this.getUsersSummary(query),
      this.getCatalogSummary(),
    ]);

    return {
      bookings,
      revenue,
      users,
      catalog,
    };
  }
}
