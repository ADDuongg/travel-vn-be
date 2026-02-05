import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourController } from './tour.controller';
import { TourService } from './tour.service';
import { Tour, TourSchema } from './schema/tour.schema';
import { ProvincesModule } from 'src/provinces/provinces.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }]),
    ProvincesModule,
  ],
  controllers: [TourController],
  providers: [TourService],
  exports: [TourService],
})
export class TourModule {}
