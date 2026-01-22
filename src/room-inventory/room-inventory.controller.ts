import {
  Controller,
  Post,
  Param,
  Query,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RoomInventoryService } from './room-inventory.service';
import { parseDateOnly } from 'src/utils/date.util';

@Controller('api/v1/room-inventories')
export class RoomInventoryController {
  constructor(private readonly inventoryService: RoomInventoryService) {}

  @Post('ensure/:roomId')
  async ensureInventory(
    @Param('roomId') roomId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }

    const roomObjectId = new Types.ObjectId(roomId);

    let fromDate: Date;
    let toDate: Date;

    try {
      fromDate = parseDateOnly(from);
      toDate = parseDateOnly(to);
    } catch {
      throw new BadRequestException('Invalid date format');
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

  @Get(':roomId/availability')
  async getRoomAvailability(
    @Param('roomId') roomId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }

    let fromDate: Date;
    let toDate: Date;

    try {
      fromDate = parseDateOnly(from);
      toDate = parseDateOnly(to);
    } catch {
      throw new BadRequestException('Invalid date');
    }

    const maxRooms = await this.inventoryService.getMaxRoomsCanBook(
      new Types.ObjectId(roomId),
      fromDate,
      toDate,
    );

    return {
      maxRoomsCanBook: maxRooms,
    };
  }
}
