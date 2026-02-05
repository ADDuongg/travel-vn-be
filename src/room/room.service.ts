import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AmenitiesService } from 'src/amenities/amenities.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { HotelService } from 'src/hotel/hotel.service';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { parseDateOnly } from 'src/utils/date.util';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto, RoomSortBy } from './dto/room-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room, RoomDocument } from './schema/room.schema';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly hotelService: HotelService,
    private readonly roomInventoryService: RoomInventoryService,
    private readonly amenitiesService: AmenitiesService,
  ) {}

  // ===== CREATE =====
  async create(dto: CreateRoomDto, files?: Express.Multer.File[]) {
    const existed = await this.roomModel.findOne({
      $or: [{ code: dto.code }, { slug: dto.slug }],
    });

    const hotel = await this.hotelService.findById(dto.hotelId);
    if (!hotel) {
      throw new BadRequestException('Hotel not found');
    }

    if (existed) {
      throw new ConflictException('Room already exists');
    }

    this.validateBookingConfig(dto.bookingConfig);

    const { thumbnail, gallery } = await this.uploadGallery(files);

    return this.roomModel.create({
      code: dto.code.toUpperCase(),
      slug: dto.slug,
      roomType: dto.roomType,
      isActive: dto.isActive,

      hotelId: dto.hotelId,

      capacity: dto.capacity,

      pricing: {
        basePrice: dto.basePrice,
        currency: dto.currency || 'VND',
      },

      inventory: {
        totalRooms: dto.totalRooms,
      },

      bookingConfig: dto.bookingConfig,

      translations: dto.translations,
      amenities: dto.amenities || [],

      sale: dto.sale?.isActive ? dto.sale : undefined,

      thumbnail,
      gallery,
    });
  }

  async findAll(query: RoomQueryDto) {
    const {
      page,
      limit,
      sortBy,
      minPrice,
      maxPrice,
      adults,
      children,
      keyword,
      lang,
      checkIn,
      checkOut,
      minRating,
      amenities,
      roomSize: roomSizeFilter,
      provinceId,
      hotelIds,
    } = query;
    console.log('query', query);

    const filter: any = {
      isActive: true,
    };

    /* if (adults) {
      filter['capacity.maxAdults'] = { $gte: adults };
    } */

    if (adults || children) {
      filter.$expr = {
        $gte: [
          {
            $add: ['$capacity.maxAdults', '$capacity.maxChildren'],
          },
          (adults ?? 0) + (children ?? 0),
        ],
      };
    }

    if (minPrice || maxPrice) {
      filter['pricing.basePrice'] = {};
      if (minPrice) filter['pricing.basePrice'].$gte = minPrice;
      if (maxPrice) filter['pricing.basePrice'].$lte = maxPrice;
    }

    if (keyword) {
      const searchLang = lang || 'en';
      filter[`translations.${searchLang}.name`] = {
        $regex: keyword,
        $options: 'i',
      };
    }

    if (checkIn && checkOut) {
      const from = parseDateOnly(checkIn);
      const to = parseDateOnly(checkOut);
      if (from < to) {
        const roomIds =
          await this.roomInventoryService.getRoomIdsWithAvailability(from, to);
        if (roomIds.length === 0) {
          return {
            items: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          };
        }
        filter._id = { $in: roomIds };
      }
    }

    if (minRating != null && minRating > 0) {
      filter['ratingSummary.average'] = { $gte: minRating };
    }
    console.log('amenities', amenities);

    if (amenities?.length) {
      const amenityIds = await this.amenitiesService.findIdsByCodes(amenities);
      console.log('amenityIds', amenityIds);

      if (amenityIds.length) {
        filter.amenities = {
          $all: amenityIds.map((id) => new Types.ObjectId(id)),
        };
      }
    }

    if (roomSizeFilter?.length) {
      filter['capacity.roomSize'] = { $in: roomSizeFilter };
    }

    if (provinceId && Types.ObjectId.isValid(provinceId)) {
      const ids = await this.hotelService.findIdsByProvinceId(provinceId);
      if (ids.length === 0) {
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      filter.hotelId = { $in: ids.map((id) => new Types.ObjectId(id)) };
    } else if (hotelIds?.length) {
      filter.hotelId = { $in: hotelIds.map((id) => new Types.ObjectId(id)) };
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
      this.roomModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'hotelId',
          select: '_id slug translations provinceId',
          populate: { path: 'provinceId', select: 'name code slug' },
        })
        .lean(),
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
    const room = await this.roomModel
      .findById(id)
      .populate({
        path: 'hotelId',
        select: '_id slug translations provinceId contact location',
        populate: { path: 'provinceId', select: 'name code slug fullName' },
      })
      .populate('amenities');
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, dto: UpdateRoomDto, files?: Express.Multer.File[]) {
    const room = await this.roomModel.findById(id);
    if (!room) throw new NotFoundException('Room not found');
    const inventoryCount =
      await this.roomInventoryService.countFutureInventories(id);
    console.log('dto.totalRooms', dto.totalRooms);

    const isTotalRoomsChanged =
      dto.totalRooms !== undefined &&
      dto.totalRooms !== room.inventory.totalRooms;

    if (inventoryCount > 0 && isTotalRoomsChanged) {
      throw new BadRequestException({
        code: 'ROOM_HAS_FUTURE_INVENTORY',
        message: `Room already has inventory for ${inventoryCount} future days. Changes are not allowed.`,
      });
    }

    this.validateBookingConfig(dto.bookingConfig);

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
      pricing: {
        basePrice: dto.basePrice,
        currency: dto.currency || 'VND',
      },

      inventory: {
        totalRooms: dto.totalRooms,
      },
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

  private validateBookingConfig(bookingConfig?: {
    minNights: number;
    maxNights?: number;
  }) {
    if (!bookingConfig) return;

    if (
      bookingConfig.maxNights &&
      bookingConfig.maxNights < bookingConfig.minNights
    ) {
      throw new BadRequestException('maxNights cannot be less than minNights');
    }
  }
}
