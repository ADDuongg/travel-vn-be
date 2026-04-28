import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TourInventoryService } from './tour-inventory.service';

@ApiTags('Public · Tour inventory')
@Controller('public/tour-inventory')
export class TourInventoryPublicController {
  constructor(private readonly inventoryService: TourInventoryService) {}

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
}
