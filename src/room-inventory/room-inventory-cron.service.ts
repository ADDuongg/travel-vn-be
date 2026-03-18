import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from 'src/room/schema/room.schema';
import { RoomInventoryService } from './room-inventory.service';
import { parseDateOnly, todayInVietnam } from 'src/utils/date.util';

@Injectable()
export class RoomInventoryCronService {
  private readonly logger = new Logger(RoomInventoryCronService.name);

  constructor(
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    private readonly roomInventoryService: RoomInventoryService,
  ) {}

  /**
   * Cron đảm bảo mỗi ngày luôn có RoomInventory cho các phòng đang active
   * trong một rolling window (ví dụ 12 tháng tới).
   *
   * Chạy lúc 03:00 hàng ngày (giờ server).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ensureRollingInventoryForActiveRooms() {
    try {
      const todayVN = todayInVietnam();
      const from = parseDateOnly(todayVN);
      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 365);

      const rooms = await this.roomModel
        .find({ isActive: true })
        .select('_id')
        .lean();

      if (!rooms.length) {
        return;
      }

      for (const room of rooms) {
        try {
          await this.roomInventoryService.ensureInventoryExists(
            room._id as Types.ObjectId,
            from,
            to,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to ensure inventory for room ${room._id}: ${
              error?.message ?? error
            }`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `RoomInventoryCronService.ensureRollingInventoryForActiveRooms failed: ${
          error?.message ?? error
        }`,
      );
    }
  }
}
