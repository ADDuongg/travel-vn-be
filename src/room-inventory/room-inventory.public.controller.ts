import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RoomInventoryService } from './room-inventory.service';
import { parseDateOnly } from 'src/utils/date.util';

@ApiTags('Public · Room inventories')
@Controller('public/room-inventories')
export class RoomInventoryPublicController {
  constructor(private readonly inventoryService: RoomInventoryService) {}

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
