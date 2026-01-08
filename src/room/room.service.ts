import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Room, RoomDocument } from './schema/room.schema';
import { AmenitiesService } from 'src/amenities/amenities.service';
import { RoomQueryDto, RoomSortBy } from './dto/room-query.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly amenitiesService: AmenitiesService,
  ) {}

  // ===== CREATE =====
  async create(dto: CreateRoomDto, files?: Express.Multer.File[]) {
    const existed = await this.roomModel.findOne({
      $or: [{ code: dto.code }, { slug: dto.slug }],
    });

    if (existed) {
      throw new ConflictException('Room already exists');
    }

    const { thumbnail, gallery } = await this.uploadGallery(files);

    return this.roomModel.create({
      code: dto.code.toUpperCase(),
      slug: dto.slug,
      isActive: dto.isActive,

      maxGuests: dto.maxGuests,
      adults: dto.adults,
      children: dto.children,
      roomSize: dto.roomSize,

      pricing: {
        basePrice: dto.basePrice,
        currency: dto.currency || 'VND',
      },

      inventory: {
        totalRooms: dto.totalRooms,
      },

      translations: dto.translations,
      amenities: dto.amenities || [],

      sale: dto.sale?.isActive ? dto.sale : undefined,

      thumbnail,
      gallery,
    });
  }

  async findAll(query: RoomQueryDto) {
    const { page, limit, sortBy, minPrice, maxPrice, adults, keyword } = query;

    const filter: any = {
      isActive: true,
    };

    if (adults) {
      filter.adults = { $gte: adults };
    }

    if (minPrice || maxPrice) {
      filter['pricing.basePrice'] = {};
      if (minPrice) filter['pricing.basePrice'].$gte = minPrice;
      if (maxPrice) filter['pricing.basePrice'].$lte = maxPrice;
    }

    if (keyword) {
      filter['translations.en.name'] = {
        $regex: keyword,
        $options: 'i',
      };
    }

    let sort: any = { createdAt: -1 };

    switch (sortBy) {
      case RoomSortBy.PRICE_ASC:
        sort = { 'pricing.basePrice': 1 };
        break;
      case RoomSortBy.PRICE_DESC:
        sort = { 'pricing.basePrice': -1 };
        break;
      case RoomSortBy.RATING_DESC:
        sort = { 'ratingSummary.average': -1 };
        break;
      case RoomSortBy.NEWEST:
        sort = { createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.roomModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.roomModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const room = await this.roomModel.findById(id).populate('amenities');
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, dto: UpdateRoomDto, files?: Express.Multer.File[]) {
    const room = await this.roomModel.findById(id);
    if (!room) throw new NotFoundException('Room not found');

    let gallery = room.gallery;
    let thumbnail = room.thumbnail;

    if (files?.length) {
      await this.deleteGallery(room.gallery);

      const uploaded = await this.uploadGallery(files);
      gallery = uploaded.gallery;
      thumbnail = uploaded.thumbnail;
    }

    Object.assign(room, {
      ...dto,
      thumbnail,
      gallery,
    });

    return room.save();
  }

  async remove(id: string) {
    const room = await this.roomModel.findById(id);
    if (!room) throw new NotFoundException('Room not found');

    await this.deleteGallery(room.gallery);

    await room.deleteOne();
    return true;
  }

  private async uploadGallery(files?: Express.Multer.File[]) {
    let thumbnail: any = null;
    const gallery: any = [];

    if (files?.length) {
      for (let i = 0; i < files.length; i++) {
        const uploaded = await this.cloudinaryService.uploadFile(files[i]);

        const image = {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          order: i,
        };

        if (i === 0) thumbnail = image;
        gallery.push(image);
      }
    }

    return { thumbnail, gallery };
  }

  private async deleteGallery(gallery: any[]) {
    if (!gallery?.length) return;

    await Promise.all(
      gallery.map((img) =>
        img.publicId ? this.cloudinaryService.deleteFile(img.publicId) : null,
      ),
    );
  }
}
