import { Controller, Get, Query } from '@nestjs/common';

import {
  AnalyticsService,
  DashboardBookingsSummary,
  DashboardCatalogSummary,
  DashboardOverview,
  DashboardRevenueSummary,
  DashboardUsersSummary,
} from './analytics.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('api/v1/admin/dashboard')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('bookings')
  getBookings(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardBookingsSummary> {
    return this.analyticsService.getBookingsSummary(query);
  }

  @Get('revenue')
  getRevenue(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardRevenueSummary> {
    return this.analyticsService.getRevenueSummary(query);
  }

  @Get('users')
  getUsers(@Query() query: DashboardQueryDto): Promise<DashboardUsersSummary> {
    return this.analyticsService.getUsersSummary(query);
  }

  @Get('catalog')
  getCatalog(): Promise<DashboardCatalogSummary> {
    return this.analyticsService.getCatalogSummary();
  }

  @Get('overview')
  getOverview(@Query() query: DashboardQueryDto): Promise<DashboardOverview> {
    return this.analyticsService.getDashboardOverview(query);
  }
}
