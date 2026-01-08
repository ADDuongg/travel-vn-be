// amenities/amenities.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { Amenity } from './schema/amenity.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class AmenitiesService {
  constructor(
    @InjectModel(Amenity.name)
    private readonly amenityModel: Model<Amenity>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateAmenityDto, file?: Express.Multer.File) {
    let icon;

    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(file);
      icon = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };
    }

    return this.amenityModel.create({
      name: dto.name,
      isActive: true,
      icon,
    });
  }

  findAll(activeOnly = true) {
    return this.amenityModel.find(activeOnly ? { isActive: true } : {});
  }

  async findByIds(ids: string[]) {
    return this.amenityModel.find({
      _id: { $in: ids },
      isActive: true,
    });
  }

  async update(id: string, dto: UpdateAmenityDto, file?: Express.Multer.File) {
    const amenity = await this.amenityModel.findById(id);
    if (!amenity) throw new NotFoundException();

    if (file) {
      if (amenity.icon?.publicId) {
        await this.cloudinaryService.deleteFile(amenity.icon.publicId);
      }

      const uploaded = await this.cloudinaryService.uploadFile(file);
      amenity.icon = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };
    }

    Object.assign(amenity, dto);
    return amenity.save();
  }

  async remove(id: string) {
    const amenity = await this.amenityModel.findById(id);
    if (!amenity) throw new NotFoundException('Amenity not found');

    if (amenity.icon?.publicId) {
      await this.cloudinaryService.deleteFile(amenity.icon.publicId);
    }

    await amenity.deleteOne();

    return { deleted: true };
  }
}
