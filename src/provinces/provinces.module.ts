import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Province, ProvinceSchema } from './schema/province.schema';
import { ProvincesController } from './provinces.controller';
import { ProvincesService } from './provinces.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [ProvincesController],
  providers: [ProvincesService],
  exports: [ProvincesService],
})
export class ProvincesModule {}
