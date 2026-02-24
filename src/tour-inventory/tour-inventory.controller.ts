import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TourInventoryService } from './tour-inventory.service';
import { BlockSlotsDto } from './dto/block-slots.dto';
import { ReleaseSlotsDto } from './dto/release-slots.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('api/v1/tour-inventory')
export class TourInventoryController {
  constructor(private readonly inventoryService: TourInventoryService) {}

  /**
   * GET /api/v1/tour-inventory/tours/:tourId/availability?month=2025-03
   * Public: xem số chỗ theo tháng (có thể gọi từ TourController GET /tours/:id/availability)
   */
  @Get('tours/:tourId/availability')
  getAvailability(
    @Param('tourId') tourId: string,
    @Query('month') month: string,
  ) {
    if (!month) {
      return this.inventoryService.getAvailabilityByMonth(
        tourId,
        new Date().toISOString().slice(0, 7),
      );
    }
    return this.inventoryService.getAvailabilityByMonth(tourId, month);
  }

  /**
   * POST /api/v1/tour-inventory/block
   * Block slots khi tạo booking (internal hoặc Admin)
   */
  @Post('block')
  blockSlots(@Body() dto: BlockSlotsDto) {
    return this.inventoryService.blockSlots(dto);
  }

  /**
   * POST /api/v1/tour-inventory/release
   * Trả chỗ khi cancel booking
   */
  @Post('release')
  releaseSlots(@Body() dto: ReleaseSlotsDto) {
    return this.inventoryService.releaseSlots(dto);
  }

  /**
   * POST /api/v1/tour-inventory/ensure
   * Admin: tạo/cập nhật inventory cho 1 ngày khởi hành
   */
  @Post('ensure')
  // @UseGuards(JwtAuthGuard)
  ensureInventory(
    @Body()
    body: {
      tourId: string;
      departureDate: string;
      totalSlots: number;
      specialPrice?: number;
    },
  ) {
    return this.inventoryService.ensureInventory(
      body.tourId,
      body.departureDate,
      body.totalSlots,
      body.specialPrice,
    );
  }
}
