// amenities/amenities.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    console.log('dto ', dto);

    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(file);
      icon = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };
    }

    if (!dto.translations || Object.keys(dto.translations).length === 0) {
      throw new BadRequestException('At least one language is required');
    }

    return this.amenityModel.create({
      isActive: dto.isActive ?? true,
      translations: dto.translations,
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

    if (dto.translations) {
      amenity.translations = dto.translations;
    }

    if (typeof dto.isActive === 'boolean') {
      amenity.isActive = dto.isActive;
    }

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
