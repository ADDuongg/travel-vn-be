import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from './schema/room.schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AmenitiesModule } from 'src/amenities/amenities.module';
import { HotelModule } from 'src/hotel/hotel.module';
import { RoomInventoryModule } from 'src/room-inventory/room-inventory.module';

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
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
