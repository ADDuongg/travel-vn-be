import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hotel, HotelSchema } from 'src/hotel/schema/hotel.schema';
import {
  TourGuide,
  TourGuideSchema,
} from 'src/tour-guide/schema/tour-guide.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import { Province, ProvinceSchema } from './schema/province.schema';
import { ProvincesAdminController } from './provinces.admin.controller';
import { ProvincesPublicController } from './provinces.public.controller';
import { ProvincesService } from './provinces.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { Language, LanguageSchema } from 'src/language/schema/language.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Province.name, schema: ProvinceSchema },
      { name: Language.name, schema: LanguageSchema },
      { name: Hotel.name, schema: HotelSchema },
      { name: Tour.name, schema: TourSchema },
      { name: TourGuide.name, schema: TourGuideSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ProvincesPublicController, ProvincesAdminController],
  providers: [ProvincesService],
  exports: [ProvincesService],
})
export class ProvincesModule {}
