import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { TourInventoryService } from './tour-inventory.service';
import { BlockSlotsDto } from './dto/block-slots.dto';
import { ReleaseSlotsDto } from './dto/release-slots.dto';

@ApiBearerAuth()
@ApiTags('Admin · Tour inventory')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/tour-inventory')
export class TourInventoryAdminController {
  constructor(private readonly inventoryService: TourInventoryService) {}

  @Post('block')
  @RequirePermissions('inventory.manage')
  @ApiCode('tour-inventory.admin.block')
  blockSlots(@Body() dto: BlockSlotsDto) {
    return this.inventoryService.blockSlots(dto);
  }

  @Post('release')
  @RequirePermissions('inventory.manage')
  @ApiCode('tour-inventory.admin.release')
  releaseSlots(@Body() dto: ReleaseSlotsDto) {
    return this.inventoryService.releaseSlots(dto);
  }

  @Post('ensure')
  @RequirePermissions('inventory.manage')
  @ApiCode('tour-inventory.admin.ensure')
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
