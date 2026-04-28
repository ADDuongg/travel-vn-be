// amenities/amenities.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AmenitiesService } from './amenities.service';
import { AmenitiesAdminController } from './amenities.admin.controller';
import { AmenitiesPublicController } from './amenities.public.controller';
import { Amenity, AmenitySchema } from './schema/amenity.schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Amenity.name, schema: AmenitySchema }]),
    CloudinaryModule,
  ],
  controllers: [AmenitiesPublicController, AmenitiesAdminController],
  providers: [AmenitiesService],
  exports: [AmenitiesService],
})
export class AmenitiesModule {}
