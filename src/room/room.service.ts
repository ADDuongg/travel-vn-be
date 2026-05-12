import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AmenitiesService } from 'src/amenities/amenities.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { HotelService } from 'src/hotel/hotel.service';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { parseDateOnly } from 'src/utils/date.util';
import {
  CreateRoomDto,
  GalleryItemDto,
  ThumbnailRefDto,
} from './dto/create-room.dto';
import { RoomQueryDto, RoomSortBy } from './dto/room-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room, RoomDocument } from './schema/room.schema';
import { FavoriteService } from 'src/favorite/favorite.service';
import { FavoriteEntityType } from 'src/favorite/favorite.types';

type StoredThumbnail = { url: string; publicId?: string; alt?: string };
type StoredGalleryItem = StoredThumbnail & { order?: number };

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly hotelService: HotelService,
    private readonly roomInventoryService: RoomInventoryService,
    private readonly amenitiesService: AmenitiesService,
    private readonly favoriteService: FavoriteService,
  ) {}

  // ===== CREATE =====
  async create(dto: CreateRoomDto) {
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

    const gallery = this.normalizeGallery(dto.gallery);
    const thumbnail = this.resolveThumbnail(dto.thumbnail, gallery);

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

  async findAll(query: RoomQueryDto, userId?: string) {
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

    if (amenities?.length) {
      const amenityIds = await this.amenitiesService.findIdsByCodes(amenities);
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

    let enrichedItems: any[] = items;
    if (userId) {
      const favSet = await this.favoriteService.existsByUserAndEntities({
        userId,
        pairs: items.map((r: any) => ({
          entityType: FavoriteEntityType.ROOM,
          entityId: String(r._id),
        })),
      });
      enrichedItems = items.map((r: any) => ({
        ...r,
        isFavorited: favSet.has(`${FavoriteEntityType.ROOM}:${String(r._id)}`),
      }));
    }

    return {
      items: enrichedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const room = await this.roomModel
      .findById(id)
      .populate({
        path: 'hotelId',
        select: '_id slug translations provinceId contact location',
        populate: { path: 'provinceId', select: 'name code slug fullName' },
      })
      .populate('amenities');
    if (!room) throw new NotFoundException('Room not found');
    const obj = room.toObject();
    if (!userId) return obj;
    const isFavorited = await this.favoriteService.isFavorited({
      userId,
      entityType: FavoriteEntityType.ROOM,
      entityId: id,
    });
    return { ...obj, isFavorited: isFavorited.isFavorited };
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.roomModel.findById(id);
    if (!room) throw new NotFoundException('Room not found');
    const inventoryCount =
      await this.roomInventoryService.countFutureInventories(id);

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

    const prevGallery = (room.gallery ?? []) as StoredGalleryItem[];
    const prevThumbnail = room.thumbnail as StoredThumbnail | undefined;

    let nextGallery = prevGallery;
    let nextThumbnail = prevThumbnail;
    let galleryTouched = false;
    let thumbnailTouched = false;

    if (dto.gallery !== undefined) {
      nextGallery = this.normalizeGallery(dto.gallery);
      galleryTouched = true;
    }

    if (dto.thumbnail !== undefined) {
      nextThumbnail = dto.thumbnail
        ? this.pickThumbnail(dto.thumbnail)
        : undefined;
      thumbnailTouched = true;
    }

    if (galleryTouched && !thumbnailTouched) {
      const stillValid =
        prevThumbnail?.publicId &&
        nextGallery.some((g) => g.publicId === prevThumbnail.publicId);
      if (!stillValid) {
        nextThumbnail = this.resolveThumbnail(undefined, nextGallery);
      }
    } else if (thumbnailTouched && !galleryTouched) {
      nextThumbnail = this.resolveThumbnail(nextThumbnail, prevGallery);
    } else if (galleryTouched && thumbnailTouched) {
      nextThumbnail = this.resolveThumbnail(nextThumbnail, nextGallery);
    }

    if (galleryTouched || thumbnailTouched) {
      await this.cleanupOrphanMedia({
        prevGallery,
        prevThumbnail,
        nextGallery,
        nextThumbnail,
      });
    }

    Object.assign(room, {
      ...dto,
      pricing: {
        basePrice: dto.basePrice ?? room.pricing.basePrice,
        currency: dto.currency ?? room.pricing.currency ?? 'VND',
      },

      inventory: {
        totalRooms: dto.totalRooms ?? room.inventory.totalRooms,
      },
      thumbnail: nextThumbnail,
      gallery: nextGallery,
    });

    return room.save();
  }

  async remove(id: string) {
    const room = await this.roomModel.findById(id);
    if (!room) throw new NotFoundException('Room not found');

    await this.cleanupOrphanMedia({
      prevGallery: (room.gallery ?? []) as StoredGalleryItem[],
      prevThumbnail: room.thumbnail as StoredThumbnail | undefined,
      nextGallery: [],
      nextThumbnail: undefined,
    });

    await room.deleteOne();
    return true;
  }

  /* ===== Media helpers (JSON-only pattern) ===== */

  private pickThumbnail(input: ThumbnailRefDto): StoredThumbnail {
    return {
      url: input.url,
      ...(input.publicId ? { publicId: input.publicId } : {}),
      ...(input.alt ? { alt: input.alt } : {}),
    };
  }

  private normalizeGallery(input?: GalleryItemDto[]): StoredGalleryItem[] {
    if (!input?.length) return [];
    return input.map((item, idx) => ({
      url: item.url,
      ...(item.publicId ? { publicId: item.publicId } : {}),
      ...(item.alt ? { alt: item.alt } : {}),
      order: item.order ?? idx,
    }));
  }

  private resolveThumbnail(
    thumbnail: ThumbnailRefDto | StoredThumbnail | undefined,
    gallery: StoredGalleryItem[],
  ): StoredThumbnail | undefined {
    if (thumbnail?.url) {
      return this.pickThumbnail(thumbnail as ThumbnailRefDto);
    }
    const first = gallery[0];
    if (!first?.url) return undefined;
    return {
      url: first.url,
      ...(first.publicId ? { publicId: first.publicId } : {}),
      ...(first.alt ? { alt: first.alt } : {}),
    };
  }

  /**
   * So sánh tập publicId trước/sau và xoá những file Cloudinary không còn được tham chiếu.
   * Lỗi xoá Cloudinary chỉ log, không fail request (best-effort cleanup).
   */
  private async cleanupOrphanMedia(args: {
    prevGallery: StoredGalleryItem[];
    prevThumbnail?: StoredThumbnail;
    nextGallery: StoredGalleryItem[];
    nextThumbnail?: StoredThumbnail;
  }) {
    const collect = (
      items: Array<StoredThumbnail | StoredGalleryItem | undefined>,
    ) =>
      new Set(
        items
          .filter((i): i is StoredThumbnail => Boolean(i?.publicId))
          .map((i) => i.publicId as string),
      );

    const oldIds = collect([args.prevThumbnail, ...args.prevGallery]);
    const newIds = collect([args.nextThumbnail, ...args.nextGallery]);

    const orphans: string[] = [];
    for (const id of oldIds) {
      if (!newIds.has(id)) orphans.push(id);
    }
    if (!orphans.length) return;

    const results = await Promise.allSettled(
      orphans.map((id) => this.cloudinaryService.deleteFile(id)),
    );
    for (const r of results) {
      if (r.status === 'rejected') {
        this.logger.warn(
          `Failed to delete orphan media: ${String(r.reason?.message ?? r.reason)}`,
        );
      }
    }
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
