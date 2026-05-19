import { Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { RoomInventoryService } from './room-inventory.service';
import { parseDateOnly } from 'src/utils/date.util';

@ApiBearerAuth()
@ApiTags('Admin · Room inventories')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/room-inventories')
export class RoomInventoryAdminController {
  constructor(private readonly inventoryService: RoomInventoryService) {}

  @Post('ensure/:roomId')
  @RequirePermissions('inventory.manage')
  @ApiCode('room-inventory.admin.ensure')
  async ensureInventory(
    @Param('roomId') roomId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new DomainException(
        'from and to are required',
        400,
        'BAD_REQUEST',
        'room.inventory.bad_request',
      );
    }

    const roomObjectId = new Types.ObjectId(roomId);

    let fromDate: Date;
    let toDate: Date;

    try {
      fromDate = parseDateOnly(from);
      toDate = parseDateOnly(to);
    } catch {
      throw new DomainException(
        'Invalid date format',
        400,
        'BAD_REQUEST',
        'room.inventory.bad_request',
      );
    }

    await this.inventoryService.ensureInventoryExists(
      roomObjectId,
      fromDate,
      toDate,
    );

    return {
      success: true,
      message: 'Inventory ensured',
    };
  }
}
