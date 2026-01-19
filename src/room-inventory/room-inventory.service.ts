import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RoomInventory,
  RoomInventoryDocument,
} from './schema/room-inventory.schema';
import { Room, RoomDocument } from 'src/room/schema/room.schema';
import {
  buildNights,
  getDatesInRange,
  normalizeDate,
  todayInVietnam,
  validateFutureDateRange,
} from 'src/utils/date.util';

@Injectable()
export class RoomInventoryService {
  constructor(
    @InjectModel(RoomInventory.name)
    private readonly RoomInventoryModel: Model<RoomInventoryDocument>,

    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
  ) {}

  /* ======================================================
     CREATE / ENSURE
     ====================================================== */

  async ensureInventoryExists(
    roomId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<void> {
    const nights = buildNights(from, to);
    if (nights.length === 0) return;

    const existing = await this.RoomInventoryModel.find(
      {
        roomId,
        date: { $in: nights },
      },
      { date: 1 },
    );

    const existingDates = new Set(existing.map((i) => i.date.getTime()));

    const room = await this.roomModel.findById(roomId);
    if (!room) throw new BadRequestException('Room not found');

    const toCreate = nights
      .filter((d) => !existingDates.has(d.getTime()))
      .map((d) => ({
        roomId,
        date: d,
        total: room.inventory.totalRooms,
        available: room.inventory.totalRooms,
      }));

    if (toCreate.length === 0) return;

    await this.RoomInventoryModel.insertMany(toCreate, {
      ordered: false,
    });
  }

  /* ======================================================
     READ / CHECK
     ====================================================== */

  async getInventoryByRange(
    roomId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<RoomInventoryDocument[]> {
    const nights = buildNights(from, to);

    return this.RoomInventoryModel.find({
      roomId,
      date: { $in: nights },
    });
  }

  async getInventoryByDate(
    roomId: Types.ObjectId,
    date: Date,
  ): Promise<RoomInventoryDocument | null> {
    return this.RoomInventoryModel.findOne({
      roomId,
      date: normalizeDate(date),
    });
  }

  async checkAvailability(
    roomId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<boolean> {
    const nights = buildNights(from, to);
    if (nights.length === 0) return false;

    const inventories = await this.RoomInventoryModel.find({
      roomId,
      date: { $in: nights },
      available: { $gt: 0 },
    });

    return inventories.length === nights.length;
  }

  /* ======================================================
     BOOK / CANCEL
     ====================================================== */

  /* ======================================================
     ADMIN
     ====================================================== */

  async updateInventoryTotal(
    inventoryId: Types.ObjectId,
    newTotal: number,
  ): Promise<RoomInventoryDocument> {
    const inventory = await this.RoomInventoryModel.findById(inventoryId);
    if (!inventory) throw new BadRequestException('Inventory not found');

    const room = await this.roomModel.findById(inventory.roomId);
    if (!room) throw new BadRequestException('Room not found');

    if (newTotal > room.inventory.totalRooms) {
      throw new BadRequestException('Total exceeds Room.totalRooms');
    }

    const booked = inventory.total - inventory.available;

    if (newTotal < booked) {
      throw new BadRequestException('New total less than booked rooms');
    }

    inventory.total = newTotal;
    inventory.available = Math.max(0, newTotal - booked);

    return inventory.save();
  }

  async deleteInventory(inventoryId: Types.ObjectId): Promise<void> {
    const inventory = await this.RoomInventoryModel.findById(inventoryId);
    if (!inventory) return;

    const booked = inventory.total - inventory.available;
    if (booked > 0) {
      throw new BadRequestException('Cannot delete inventory with bookings');
    }

    await inventory.deleteOne();
  }

  async getMaxRoomsCanBook(
    roomId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<number> {
    validateFutureDateRange(from, to);
    const nights = buildNights(from, to);

    if (nights.length === 0) {
      return 0;
    }

    // Lấy inventory đã tồn tại trong range
    const inventories = await this.RoomInventoryModel.find({
      roomId,
      date: { $in: nights },
    });

    // Nếu CHƯA có inventory nào → room mới
    if (inventories.length === 0) {
      const room = await this.roomModel.findById(roomId);
      if (!room) {
        throw new BadRequestException('Room not found');
      }

      return room.inventory.totalRooms;
    }

    // Nếu CÓ inventory → lấy min available
    const minAvailable = Math.min(...inventories.map((inv) => inv.available));

    return Math.max(0, minAvailable);
  }

  async reserveInventoryRange(
    roomId: Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
    quantity: number,
  ) {
    const dates = getDatesInRange(checkIn, checkOut);

    for (const date of dates) {
      const res = await this.RoomInventoryModel.updateOne(
        {
          roomId,
          date,
          available: { $gte: quantity },
        },
        {
          $inc: { available: -quantity },
        },
      );

      if (res.modifiedCount === 0) {
        throw new BadRequestException('Not enough availability');
      }
    }
  }

  async rollbackInventoryRange(
    roomId: Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
    quantity: number,
  ) {
    const dates = getDatesInRange(checkIn, checkOut);

    await this.RoomInventoryModel.updateMany(
      {
        roomId,
        date: { $in: dates },
      },
      {
        $inc: { available: quantity },
      },
    );
  }

  async countFutureInventories(roomId: string) {
    // const today = normalizeDate(new Date());
    const todayVN = todayInVietnam();
    return this.RoomInventoryModel.countDocuments({
      roomId: new Types.ObjectId(roomId),
      date: { $gte: todayVN },
    });
  }
}
