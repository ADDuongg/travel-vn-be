import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AmenitiesModule } from 'src/amenities/amenities.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { HotelModule } from 'src/hotel/hotel.module';
import { RoomInventoryModule } from 'src/room-inventory/room-inventory.module';
import { FavoriteModule } from 'src/favorite/favorite.module';

import { RoomAdminController } from './room.admin.controller';
import { RoomPublicController } from './room.public.controller';
import { RoomService } from './room.service';
import { Room, RoomSchema } from './schema/room.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      /* {
        name: Hotel.name,
        schema: HotelSchema,
      }, */
    ]),
    CloudinaryModule,
    AmenitiesModule,
    HotelModule,
    RoomInventoryModule,
    FavoriteModule,
  ],
  controllers: [RoomPublicController, RoomAdminController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
