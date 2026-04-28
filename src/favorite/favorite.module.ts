import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hotel, HotelSchema } from 'src/hotel/schema/hotel.schema';
import { Room, RoomSchema } from 'src/room/schema/room.schema';
import { TourGuide, TourGuideSchema } from 'src/tour-guide/schema/tour-guide.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import { FavoriteAdminController } from './favorite.admin.controller';
import { FavoriteClientController } from './favorite.client.controller';
import { FavoriteRepository } from './favorite.repository';
import { FavoriteService } from './favorite.service';
import { Favorite, FavoriteSchema } from './schema/favorite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Tour.name, schema: TourSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Hotel.name, schema: HotelSchema },
      { name: TourGuide.name, schema: TourGuideSchema },
    ]),
  ],
  controllers: [FavoriteClientController, FavoriteAdminController],
  providers: [FavoriteRepository, FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}

