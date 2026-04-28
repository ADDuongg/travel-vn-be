import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  AnalyticsService,
  DashboardBookingsSummary,
  DashboardCatalogSummary,
  DashboardOverview,
  DashboardRevenueSummary,
  DashboardUsersSummary,
} from './analytics.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';

@ApiBearerAuth()
@ApiTags('Admin · Analytics')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/dashboard')
export class AnalyticsAdminController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('bookings')
  @RequirePermissions('dashboard.view')
  getBookings(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardBookingsSummary> {
    return this.analyticsService.getBookingsSummary(query);
  }

  @Get('revenue')
  @RequirePermissions('dashboard.view')
  getRevenue(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardRevenueSummary> {
    return this.analyticsService.getRevenueSummary(query);
  }

  @Get('users')
  @RequirePermissions('dashboard.view')
  getUsers(@Query() query: DashboardQueryDto): Promise<DashboardUsersSummary> {
    return this.analyticsService.getUsersSummary(query);
  }

  @Get('catalog')
  @RequirePermissions('dashboard.view')
  getCatalog(): Promise<DashboardCatalogSummary> {
    return this.analyticsService.getCatalogSummary();
  }

  @Get('overview')
  @RequirePermissions('dashboard.view')
  getOverview(@Query() query: DashboardQueryDto): Promise<DashboardOverview> {
    return this.analyticsService.getDashboardOverview(query);
  }
}
