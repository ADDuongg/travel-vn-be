import { Module } from '@nestjs/common';
import { RoomInventoryService } from './room-inventory.service';
import { RoomInventoryAdminController } from './room-inventory.admin.controller';
import { RoomInventoryPublicController } from './room-inventory.public.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RoomInventory,
  RoomInventorySchema,
} from './schema/room-inventory.schema';
import { Room, RoomSchema } from 'src/room/schema/room.schema';
import { RoomInventoryCronService } from './room-inventory-cron.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoomInventory.name, schema: RoomInventorySchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  controllers: [RoomInventoryPublicController, RoomInventoryAdminController],
  providers: [RoomInventoryService, RoomInventoryCronService],
  exports: [RoomInventoryService],
})
export class RoomInventoryModule {}
