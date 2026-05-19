import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
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
      throw new DomainException(
        'from and to are required',
        400,
        'BAD_REQUEST',
        'room.inventory.bad_request',
      );
    }

    let fromDate: Date;
    let toDate: Date;

    try {
      fromDate = parseDateOnly(from);
      toDate = parseDateOnly(to);
    } catch {
      throw new DomainException(
        'Invalid date',
        400,
        'BAD_REQUEST',
        'room.inventory.bad_request',
      );
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
