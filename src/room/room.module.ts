import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from './schema/room.schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AmenitiesModule } from 'src/amenities/amenities.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
    CloudinaryModule,
    AmenitiesModule,
  ],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
