import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelAdminController } from './hotel.admin.controller';
import { HotelPublicController } from './hotel.public.controller';
import { HotelService } from './hotel.service';
import { Hotel, HotelSchema } from './schema/hotel.schema';
import { ProvincesModule } from 'src/provinces/provinces.module';
import { FavoriteModule } from 'src/favorite/favorite.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hotel.name, schema: HotelSchema }]),
    ProvincesModule,
    FavoriteModule,
  ],
  controllers: [HotelPublicController, HotelAdminController],
  providers: [HotelService],
  exports: [HotelService],
})
export class HotelModule {}
