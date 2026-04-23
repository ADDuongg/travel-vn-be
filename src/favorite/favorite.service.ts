import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Hotel, HotelDocument } from 'src/hotel/schema/hotel.schema';
import { Room, RoomDocument } from 'src/room/schema/room.schema';
import { TourGuide, TourGuideDocument } from 'src/tour-guide/schema/tour-guide.schema';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import {
  FavoriteEntitySummary,
  FavoriteEntityType,
} from './favorite.types';
import { FavoriteRepository } from './favorite.repository';

@Injectable()
export class FavoriteService {
  constructor(
    private readonly favoriteRepository: FavoriteRepository,

    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,

    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,

    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,

    @InjectModel(TourGuide.name)
    private readonly tourGuideModel: Model<TourGuideDocument>,
  ) {}

  async toggleFavorite(params: {
    userId?: string;
    entityType: FavoriteEntityType;
    entityId: string;
  }) {
    if (!params.userId) {
      throw new BadRequestException('Unauthorized');
    }
    if (!Types.ObjectId.isValid(params.entityId)) {
      throw new BadRequestException('Invalid entityId');
    }
    const userId = new Types.ObjectId(params.userId);
    const entityId = new Types.ObjectId(params.entityId);
    return this.favoriteRepository.toggle({
      userId,
      entityType: params.entityType,
      entityId,
    });
  }

  async isFavorited(params: {
    userId?: string;
    entityType: FavoriteEntityType;
    entityId: string;
  }): Promise<{ isFavorited: boolean }> {
    if (!params.userId) {
      throw new BadRequestException('Unauthorized');
    }
    if (!Types.ObjectId.isValid(params.entityId)) {
      throw new BadRequestException('Invalid entityId');
    }
    const userId = new Types.ObjectId(params.userId);
    const entityId = new Types.ObjectId(params.entityId);
    const exists = await this.favoriteRepository.exists({
      userId,
      entityType: params.entityType,
      entityId,
    });
    return { isFavorited: exists };
  }

  async findMyFavoritesList(params: {
    userId?: string;
    entityType?: FavoriteEntityType;
    page?: number;
    limit?: number;
    lang?: string;
  }) {
    const userIdStr = params.userId;
    if (!userIdStr) {
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      };
    }
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const lang = (params.lang || 'vi').trim() || 'vi';

    const { data: favorites, total } = await this.favoriteRepository.findByUser({
      userId: new Types.ObjectId(userIdStr),
      entityType: params.entityType,
      page,
      limit,
    });

    const summaryMap = await this.buildEntitySummaryMap(
      favorites as Array<{
        entityType: FavoriteEntityType;
        entityId: Types.ObjectId;
      }>,
      lang,
    );

    const data = favorites.map((f: any) => {
      const entityIdStr = (f.entityId as Types.ObjectId).toString();
      const key = `${f.entityType}:${entityIdStr}`;
      return {
        ...f,
        _id: (f._id as Types.ObjectId).toString(),
        userId: (f.userId as Types.ObjectId).toString(),
        entityId: entityIdStr,
        entitySummary:
          summaryMap.get(key) ??
          ({
            id: entityIdStr,
            type: f.entityType,
            name: '',
            thumbnailUrl: '',
          } as FavoriteEntitySummary),
      };
    });

    return {
      data,
      pagination: { page, limit, total },
    };
  }

  async adminFindAll(params: {
    userId?: string;
    entityType?: FavoriteEntityType;
    entityId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const { data, total } = await this.favoriteRepository.adminFindAll({
      userId:
        params.userId && Types.ObjectId.isValid(params.userId)
          ? new Types.ObjectId(params.userId)
          : undefined,
      entityType: params.entityType,
      entityId:
        params.entityId && Types.ObjectId.isValid(params.entityId)
          ? new Types.ObjectId(params.entityId)
          : undefined,
      page,
      limit,
    });

    return {
      data: data.map((f: any) => ({
        ...f,
        _id: (f._id as Types.ObjectId).toString(),
        userId: (f.userId as Types.ObjectId).toString(),
        entityId: (f.entityId as Types.ObjectId).toString(),
      })),
      pagination: { page, limit, total },
    };
  }

  async existsByUserAndEntities(params: {
    userId: string;
    pairs: Array<{ entityType: FavoriteEntityType; entityId: string }>;
  }): Promise<Set<string>> {
    const { userId, pairs } = params;
    if (!Types.ObjectId.isValid(userId)) return new Set();
    const normalized = pairs
      .filter((p) => Types.ObjectId.isValid(p.entityId))
      .map((p) => ({
        entityType: p.entityType,
        entityId: new Types.ObjectId(p.entityId),
      }));

    const docs = await this.favoriteRepository.findByUserAndEntities({
      userId: new Types.ObjectId(userId),
      pairs: normalized,
    });

    return new Set(docs.map((d) => `${d.entityType}:${d.entityId.toString()}`));
  }

  private pickTranslatedName(
    translations: Record<string, { name?: string }> | undefined,
    lang: string,
  ): string {
    if (!translations || typeof translations !== 'object') return '';
    const primary = translations[lang]?.name?.trim();
    if (primary) return primary;
    const vi = translations['vi']?.name?.trim();
    if (vi) return vi;
    for (const code of Object.keys(translations)) {
      const n = translations[code]?.name?.trim();
      if (n) return n;
    }
    return '';
  }

  private uniqueEntityIds(
    favorites: Array<{ entityType: FavoriteEntityType; entityId: Types.ObjectId }>,
    entityType: FavoriteEntityType,
  ): Types.ObjectId[] {
    const seen = new Set<string>();
    const out: Types.ObjectId[] = [];
    for (const f of favorites) {
      if (f.entityType !== entityType) continue;
      const s = f.entityId.toString();
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(f.entityId);
    }
    return out;
  }

  private async buildEntitySummaryMap(
    favorites: Array<{ entityType: FavoriteEntityType; entityId: Types.ObjectId }>,
    lang: string,
  ): Promise<Map<string, FavoriteEntitySummary>> {
    const map = new Map<string, FavoriteEntitySummary>();
    if (!favorites.length) return map;

    const tourIds = this.uniqueEntityIds(favorites, FavoriteEntityType.TOUR);
    const roomIds = this.uniqueEntityIds(favorites, FavoriteEntityType.ROOM);
    const hotelIds = this.uniqueEntityIds(favorites, FavoriteEntityType.HOTEL);
    const guideIds = this.uniqueEntityIds(favorites, FavoriteEntityType.GUIDE);

    await Promise.all([
      tourIds.length
        ? this.tourModel
            .find({ _id: { $in: tourIds } })
            .select('translations thumbnail slug ratingSummary')
            .lean()
            .then((docs: any[]) => {
              for (const d of docs) {
                const id = (d._id as Types.ObjectId).toString();
                map.set(`${FavoriteEntityType.TOUR}:${id}`, {
                  id,
                  type: FavoriteEntityType.TOUR,
                  slug: d.slug,
                  name: this.pickTranslatedName(d.translations, lang),
                  thumbnailUrl: d.thumbnail?.url?.trim() ?? '',
                  ratingSummary: d.ratingSummary,
                });
              }
            })
        : Promise.resolve(),
      roomIds.length
        ? this.roomModel
            .find({ _id: { $in: roomIds } })
            .select('translations thumbnail slug ratingSummary')
            .lean()
            .then((docs: any[]) => {
              for (const d of docs) {
                const id = (d._id as Types.ObjectId).toString();
                map.set(`${FavoriteEntityType.ROOM}:${id}`, {
                  id,
                  type: FavoriteEntityType.ROOM,
                  slug: d.slug,
                  name: this.pickTranslatedName(d.translations, lang),
                  thumbnailUrl: d.thumbnail?.url?.trim() ?? '',
                  ratingSummary: d.ratingSummary,
                });
              }
            })
        : Promise.resolve(),
      hotelIds.length
        ? this.hotelModel
            .find({ _id: { $in: hotelIds } })
            .select('translations thumbnail slug ratingSummary')
            .lean()
            .then((docs: any[]) => {
              for (const d of docs) {
                const id = (d._id as Types.ObjectId).toString();
                map.set(`${FavoriteEntityType.HOTEL}:${id}`, {
                  id,
                  type: FavoriteEntityType.HOTEL,
                  slug: d.slug,
                  name: this.pickTranslatedName(d.translations, lang),
                  thumbnailUrl: d.thumbnail?.url?.trim() ?? '',
                  ratingSummary: d.ratingSummary,
                });
              }
            })
        : Promise.resolve(),
      guideIds.length
        ? this.tourGuideModel
            .find({ _id: { $in: guideIds }, isActive: true })
            .select('gallery ratingSummary userId')
            .populate('userId', 'fullName')
            .lean()
            .then((docs: any[]) => {
              for (const d of docs) {
                const id = (d._id as Types.ObjectId).toString();
                const thumb =
                  Array.isArray(d.gallery) && d.gallery.length > 0
                    ? (d.gallery[0]?.url?.trim() ?? '')
                    : '';
                map.set(`${FavoriteEntityType.GUIDE}:${id}`, {
                  id,
                  type: FavoriteEntityType.GUIDE,
                  name: d.userId?.fullName?.trim?.() ?? '',
                  thumbnailUrl: thumb,
                  ratingSummary: d.ratingSummary,
                });
              }
            })
        : Promise.resolve(),
    ]);

    return map;
  }
}

