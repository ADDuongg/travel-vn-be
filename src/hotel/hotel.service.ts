import { Injectable, Logger } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import {
  CreateHotelDto,
  GalleryItemDto,
  ThumbnailRefDto,
} from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelQueryDto } from './dto/hotel-query.dto';
import { Hotel, HotelDocument } from './schema/hotel.schema';
import { ProvincesService } from 'src/provinces/provinces.service';
import { FavoriteService } from 'src/favorite/favorite.service';
import { FavoriteEntityType } from 'src/favorite/favorite.types';

type StoredThumbnail = { url: string; publicId?: string; alt?: string };
type StoredGalleryItem = StoredThumbnail & { order?: number };

@Injectable()
export class HotelService {
  private readonly logger = new Logger(HotelService.name);

  constructor(
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly provincesService: ProvincesService,
    private readonly favoriteService: FavoriteService,
  ) {}

  /**
   * Create a new hotel.
   * Validates provinceId exists before creating.
   */
  async create(dto: CreateHotelDto): Promise<Hotel> {
    const existed = await this.hotelModel.findOne({ slug: dto.slug });
    if (existed) {
      throw new DomainException('Hotel slug already exists', 409, 'CONFLICT', 'hotel.conflict');
    }

    const provinces = await this.provincesService.findAllForDropdown();
    const provinceExists = provinces.some(
      (p: { _id: unknown }) => String(p._id) === dto.provinceId,
    );
    if (!provinceExists) {
      throw new DomainException('Province not found', 400, 'BAD_REQUEST', 'hotel.bad_request');
    }

    const gallery = this.normalizeGallery(dto.gallery);
    const thumbnail = this.resolveThumbnail(dto.thumbnail, gallery);

    return this.hotelModel.create({
      slug: dto.slug,
      isActive: dto.isActive ?? true,
      starRating: dto.starRating ?? 3,
      provinceId: new Types.ObjectId(dto.provinceId),
      translations: dto.translations,
      contact: dto.contact,
      location: dto.location,
      amenities: dto.amenities?.map((id) => new Types.ObjectId(id)) ?? [],
      ratingSummary: { average: 0, total: 0 },
      thumbnail,
      gallery,
    });
  }

  /**
   * Get hotel IDs in a province (for room filtering).
   */
  async findIdsByProvinceId(provinceId: string): Promise<string[]> {
    const hotels = await this.hotelModel
      .find({
        isActive: true,
        provinceId: new Types.ObjectId(provinceId),
      })
      .select('_id')
      .lean();
    return hotels.map((h) => (h._id as Types.ObjectId).toString());
  }

  /**
   * Find all active hotels (same document shape as findById: full schema + populated province & amenities).
   */
  async findAllActive(query: HotelQueryDto = {}, userId?: string) {
    const { provinceId, page = 1, limit = 12 } = query;
    const filter: Record<string, unknown> = { isActive: true };
    if (provinceId && Types.ObjectId.isValid(provinceId)) {
      filter.provinceId = new Types.ObjectId(provinceId);
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.hotelModel
        .find(filter)
        .sort({ 'translations.vi.name': 1 })
        .skip(skip)
        .limit(limit)
        .populate('provinceId', 'name code slug fullName')
        .populate('amenities')
        .lean(),
      this.hotelModel.countDocuments(filter),
    ]);

    if (!userId) {
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
    const favSet = await this.favoriteService.existsByUserAndEntities({
      userId,
      pairs: items.map((h: any) => ({
        entityType: FavoriteEntityType.HOTEL,
        entityId: String(h._id),
      })),
    });
    return {
      items: items.map((h: any) => ({
        ...h,
        isFavorited: favSet.has(`${FavoriteEntityType.HOTEL}:${String(h._id)}`),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllActiveOptions(provinceId?: string, userId?: string) {
    const result = await this.findAllActive(
      { provinceId, page: 1, limit: 1000 },
      userId,
    );
    return result.items;
  }

  /**
   * Find hotel by ID.
   */
  async findById(
    id: string,
    userId?: string,
  ): Promise<Record<string, unknown> | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const hotel = await this.hotelModel
      .findById(id)
      .populate('provinceId', 'name code slug fullName')
      .populate('amenities')
      .exec();
    if (!hotel) return null;
    const obj = hotel.toObject() as unknown as Record<string, unknown>;
    if (!userId) return obj;
    const isFavorited = await this.favoriteService.isFavorited({
      userId,
      entityType: FavoriteEntityType.HOTEL,
      entityId: id,
    });
    return { ...obj, isFavorited: isFavorited.isFavorited };
  }

  /**
   * Update hotel by ID.
   */
  async update(id: string, dto: UpdateHotelDto): Promise<Hotel> {
    const hotel = await this.hotelModel.findById(id);
    if (!hotel) {
      throw new NotFoundDomainException('Hotel not found', 'NOT_FOUND', 'hotel.not_found');
    }

    if (dto.slug !== undefined && dto.slug !== hotel.slug) {
      const existed = await this.hotelModel.findOne({ slug: dto.slug });
      if (existed) {
        throw new DomainException('Hotel slug already exists', 409, 'CONFLICT', 'hotel.conflict');
      }
      hotel.slug = dto.slug;
    }

    if (dto.provinceId !== undefined) {
      const provinces = await this.provincesService.findAllForDropdown();
      const provinceExists = provinces.some(
        (p: { _id: unknown }) => String(p._id) === dto.provinceId,
      );
      if (!provinceExists) {
        throw new DomainException('Province not found', 400, 'BAD_REQUEST', 'hotel.bad_request');
      }
      hotel.provinceId = new Types.ObjectId(dto.provinceId);
    }

    if (dto.isActive !== undefined) hotel.isActive = dto.isActive;
    if (dto.starRating !== undefined) hotel.starRating = dto.starRating;
    if (dto.translations !== undefined) hotel.translations = dto.translations;
    if (dto.contact !== undefined) hotel.contact = dto.contact;
    if (dto.location !== undefined) hotel.location = dto.location;
    if (dto.amenities !== undefined) {
      hotel.amenities = dto.amenities.map((aid) => new Types.ObjectId(aid));
    }

    const prevGallery = (hotel.gallery ?? []) as StoredGalleryItem[];
    const prevThumbnail = hotel.thumbnail as StoredThumbnail | undefined;

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

    hotel.thumbnail = nextThumbnail;
    hotel.gallery = nextGallery;

    return hotel.save();
  }

  async remove(id: string): Promise<boolean> {
    const hotel = await this.hotelModel.findById(id);
    if (!hotel) {
      throw new NotFoundDomainException('Hotel not found', 'NOT_FOUND', 'hotel.not_found');
    }

    await this.cleanupOrphanMedia({
      prevGallery: (hotel.gallery ?? []) as StoredGalleryItem[],
      prevThumbnail: hotel.thumbnail as StoredThumbnail | undefined,
      nextGallery: [],
      nextThumbnail: undefined,
    });

    await hotel.deleteOne();
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
}
