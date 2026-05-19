import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Hotel, HotelDocument } from 'src/hotel/schema/hotel.schema';
import {
  TourGuide,
  TourGuideDocument,
} from 'src/tour-guide/schema/tour-guide.schema';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import {
  Language,
  LanguageDocument,
} from 'src/language/schema/language.schema';
import {
  Province,
  ProvinceDocument,
  ProvinceHighlight,
  ProvinceHighlightTranslationBlock,
} from './schema/province.schema';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { ProvinceQueryDto, ProvinceSortBy } from './dto/province-query.dto';

type NormalizedHighlight = {
  translations: Record<string, ProvinceHighlightTranslationBlock>;
  thumbnail?: {
    url?: string;
    publicId?: string;
    alt?: string;
    order?: number;
  };
};

const FALLBACK_LANG_CODES = ['vi', 'en'] as const;

@Injectable()
export class ProvincesService {
  constructor(
    @InjectModel(Province.name)
    private readonly provinceModel: Model<ProvinceDocument>,
    @InjectModel(Language.name)
    private readonly languageModel: Model<LanguageDocument>,
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    @InjectModel(TourGuide.name)
    private readonly tourGuideModel: Model<TourGuideDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async getActiveLangCodes(): Promise<string[]> {
    const langs = await this.languageModel
      .find({ isActive: true })
      .select('code')
      .lean();
    if (!langs.length) {
      return [...FALLBACK_LANG_CODES];
    }
    return langs.map((l) => String(l.code).toLowerCase());
  }

  private sortKeyForName(langCodes: string[]): string {
    return `name.${langCodes[0] ?? 'vi'}`;
  }

  async findAll(query: ProvinceQueryDto) {
    const {
      page = 1,
      limit = 34,
      region,
      isPopular,
      isActive,
      search,
      sort = ProvinceSortBy.NAME,
    } = query;

    const langCodes = await this.getActiveLangCodes();
    const nameSort = this.sortKeyForName(langCodes);

    const filter: Record<string, unknown> = {};

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }
    if (typeof isPopular === 'boolean') {
      filter.isPopular = isPopular;
    }
    if (region) {
      filter.region = region;
    }
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = langCodes.map((code) => ({
        [`name.${code}`]: regex,
      }));
    }

    let sortOption: Record<string, 1 | -1> = { [nameSort]: 1 };
    switch (sort) {
      case ProvinceSortBy.DISPLAY_ORDER:
        sortOption = { displayOrder: 1, [nameSort]: 1 };
        break;
      case ProvinceSortBy.NEWEST:
        sortOption = { createdAt: -1 };
        break;
      case ProvinceSortBy.NAME:
      default:
        sortOption = { [nameSort]: 1 };
        break;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.provinceModel
        .find(filter)
        .select('-wards')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.provinceModel.countDocuments(filter),
    ]);
    const itemsWithCounts = await this.attachCountsToProvinces(items);

    return {
      items: itemsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const province = await this.provinceModel.findOne({ slug }).lean();
    if (!province)
      throw new NotFoundDomainException(
        'Province not found',
        'NOT_FOUND',
        'provinces.not_found',
      );
    const [provinceWithCounts] = await this.attachCountsToProvinces([province]);
    return provinceWithCounts;
  }

  async findPopular() {
    const langCodes = await this.getActiveLangCodes();
    const nameSort = this.sortKeyForName(langCodes);
    return this.provinceModel
      .find({ isActive: true, isPopular: true })
      .select('-wards')
      .sort({ displayOrder: 1, [nameSort]: 1 })
      .lean();
  }

  async findAllForDropdown() {
    const langCodes = await this.getActiveLangCodes();
    const nameSort = this.sortKeyForName(langCodes);
    return this.provinceModel
      .find({ type: 'province' })
      .select('_id code slug name fullName wards')
      .sort({ [nameSort]: 1 })
      .lean();
  }

  async update(id: string, dto: UpdateProvinceDto) {
    const requiredLangs = await this.getActiveLangCodes();
    const province = await this.provinceModel.findById(id).exec();
    if (!province)
      throw new NotFoundDomainException(
        'Province not found',
        'NOT_FOUND',
        'provinces.not_found',
      );

    if (dto.translations !== undefined)
      province.translations = dto.translations;
    if (dto.isPopular !== undefined) province.isPopular = dto.isPopular;
    if (dto.displayOrder !== undefined)
      province.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) province.isActive = dto.isActive;
    if (dto.region !== undefined) province.region = dto.region;
    if (dto.population !== undefined) province.population = dto.population;
    if (dto.area !== undefined) province.area = dto.area;

    const parsedThumbnail = this.normalizeThumbnail(dto.thumbnail);
    if (parsedThumbnail !== undefined) {
      if (
        province.thumbnail?.publicId &&
        parsedThumbnail.publicId !== province.thumbnail.publicId
      ) {
        await this.cloudinaryService
          .deleteFile(province.thumbnail.publicId)
          .catch(() => {});
      }
      province.thumbnail = parsedThumbnail;
    }

    const parsedHighlights = this.normalizeHighlights(
      dto.highlights,
      requiredLangs,
    );
    if (parsedHighlights !== undefined) {
      await this.deleteRemovedHighlightThumbnails(
        this.highlightsAsPlain(province.highlights) as
          | Array<{ thumbnail?: { publicId?: string } }>
          | undefined,
        parsedHighlights,
      );
      province.highlights =
        this.sanitizeHighlightsForPersistence(parsedHighlights);
    }

    if (dto.gallery !== undefined) {
      await this.deleteRemovedGalleryImages(province.gallery, dto.gallery);
      province.gallery = dto.gallery;
    }

    return province.save().then((p) => p.toObject());
  }

  private highlightsAsPlain(
    raw: ProvinceDocument['highlights'],
  ): unknown[] | undefined {
    if (raw == null) return undefined;
    if (!Array.isArray(raw)) return undefined;
    return raw.map((h) => {
      if (h && typeof h === 'object' && 'toObject' in h) {
        const t = h as { toObject?: () => object };
        if (typeof t.toObject === 'function') return t.toObject();
      }
      return h;
    });
  }

  async softDelete(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province)
      throw new NotFoundDomainException(
        'Province not found',
        'NOT_FOUND',
        'provinces.not_found',
      );
    province.isActive = false;
    await province.save();
    return { message: 'Province deactivated successfully' };
  }

  async restore(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province)
      throw new NotFoundDomainException(
        'Province not found',
        'NOT_FOUND',
        'provinces.not_found',
      );
    province.isActive = true;
    await province.save();
    return { message: 'Province restored successfully' };
  }

  async togglePopular(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province)
      throw new NotFoundDomainException(
        'Province not found',
        'NOT_FOUND',
        'provinces.not_found',
      );
    province.isPopular = !province.isPopular;
    return province.save().then((p) => p.toObject());
  }

  private async deleteRemovedHighlightThumbnails(
    current: Array<{ thumbnail?: { publicId?: string } }> | null | undefined,
    next: NormalizedHighlight[],
  ) {
    if (!current?.length) return;
    const nextIds = new Set(
      next
        .map((h) => h.thumbnail?.publicId)
        .filter((id): id is string => Boolean(id)),
    );
    for (const h of current) {
      const pid = h.thumbnail?.publicId;
      if (pid && !nextIds.has(pid)) {
        await this.cloudinaryService.deleteFile(pid).catch(() => {});
      }
    }
  }

  private async deleteRemovedGalleryImages(
    currentGallery: Array<{ url?: string; publicId?: string }> | undefined,
    newGallery: Array<{ url?: string; publicId?: string }> | undefined,
  ) {
    if (!currentGallery?.length || !newGallery) return;
    const newIds = new Set(
      newGallery.map((img) => img.publicId).filter(Boolean),
    );
    const toDelete = currentGallery.filter(
      (img) => img.publicId && !newIds.has(img.publicId),
    );
    await Promise.all(
      toDelete.map((img) =>
        img.publicId
          ? this.cloudinaryService.deleteFile(img.publicId).catch(() => {})
          : Promise.resolve(),
      ),
    );
  }

  private async attachCountsToProvinces<T extends { _id: unknown }>(
    provinces: T[],
  ): Promise<Array<T & ProvinceTravelCounts>> {
    if (!provinces.length) return [];
    const provinceIds = provinces.map((province) => String(province._id));

    const [hotelCounts, tourGuideCounts, tourCounts] = await Promise.all([
      this.countHotelsByProvinceIds(provinceIds),
      this.countTourGuidesByProvinceIds(provinceIds),
      this.countToursByProvinceIds(provinceIds),
    ]);

    return provinces.map((province) => {
      const provinceId = String(province._id);
      return {
        ...province,
        totalHotels: hotelCounts[provinceId] ?? 0,
        totalTours: tourCounts[provinceId] ?? 0,
        totalTourGuides: tourGuideCounts[provinceId] ?? 0,
      };
    });
  }

  private async countHotelsByProvinceIds(
    provinceIds: string[],
  ): Promise<Record<string, number>> {
    const objectIds = provinceIds.map((id) => new Types.ObjectId(id));
    const rows = await this.hotelModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            isActive: true,
            provinceId: { $in: objectIds },
          },
        },
        {
          $group: {
            _id: '$provinceId',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return this.toCountMap(rows);
  }

  private async countTourGuidesByProvinceIds(
    provinceIds: string[],
  ): Promise<Record<string, number>> {
    const objectIds = provinceIds.map((id) => new Types.ObjectId(id));
    const rows = await this.tourGuideModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            isActive: true,
            specializedProvinces: { $in: objectIds },
          },
        },
        { $unwind: '$specializedProvinces' },
        {
          $match: {
            specializedProvinces: { $in: objectIds },
          },
        },
        {
          $group: {
            _id: '$specializedProvinces',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return this.toCountMap(rows);
  }

  private async countToursByProvinceIds(
    provinceIds: string[],
  ): Promise<Record<string, number>> {
    const objectIds = provinceIds.map((id) => new Types.ObjectId(id));
    const rows = await this.tourModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            isActive: true,
            $or: [
              { 'destinations.provinceId': { $in: objectIds } },
              { departureProvinceId: { $in: objectIds } },
            ],
          },
        },
        {
          $project: {
            matchedProvinceIds: {
              $setUnion: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: '$destinations',
                        as: 'destination',
                        cond: { $in: ['$$destination.provinceId', objectIds] },
                      },
                    },
                    as: 'destination',
                    in: '$$destination.provinceId',
                  },
                },
                {
                  $cond: [
                    { $in: ['$departureProvinceId', objectIds] },
                    ['$departureProvinceId'],
                    [],
                  ],
                },
              ],
            },
          },
        },
        { $unwind: '$matchedProvinceIds' },
        {
          $group: {
            _id: '$matchedProvinceIds',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return this.toCountMap(rows);
  }

  private toCountMap(
    rows: Array<{ _id: Types.ObjectId; count: number }>,
  ): Record<string, number> {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[String(row._id)] = row.count;
      return acc;
    }, {});
  }

  private normalizeThumbnail(raw: unknown):
    | {
        url: string;
        publicId?: string;
        alt?: string;
      }
    | undefined {
    if (raw === undefined) return undefined;
    const parsed = this.parseJsonIfString(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const thumb = parsed as Record<string, unknown>;
    const url = this.asNonEmptyString(thumb.url);
    if (!url) return undefined;
    return {
      url,
      publicId: this.asNonEmptyString(thumb.publicId),
      alt: this.asNonEmptyString(thumb.alt),
    };
  }

  private normalizeHighlights(
    raw: unknown,
    requiredLangCodes: string[],
  ): NormalizedHighlight[] | undefined {
    if (raw === undefined) return undefined;
    const parsed = this.parseJsonIfString(raw);
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed === 'object') {
        throw new DomainException(
          'highlights must be a JSON array',
          400,
          'BAD_REQUEST',
          'provinces.bad_request',
        );
      }
      return [];
    }

    const mapped: NormalizedHighlight[] = [];
    for (const item of parsed) {
      const n: NormalizedHighlight | undefined = this.normalizeHighlightItem(
        item,
        requiredLangCodes,
      );
      if (n) mapped.push(n);
    }

    if (parsed.length > 0 && mapped.length === 0) {
      throw new DomainException(
        `No valid highlight items: each item needs translations with non-empty name for: ${requiredLangCodes.join(', ')} (or legacy name/description per language).`,
        400,
        'BAD_REQUEST',
        'provinces.bad_request',
      );
    }

    return mapped;
  }

  private normalizeHighlightItem(
    item: unknown,
    requiredLangCodes: string[],
  ): NormalizedHighlight | undefined {
    const coalesced = this.parseJsonIfString(item);
    if (
      !coalesced ||
      typeof coalesced !== 'object' ||
      Array.isArray(coalesced)
    ) {
      return undefined;
    }
    const raw = coalesced as Record<string, unknown>;

    let translations = this.parseTranslationsObject(raw.translations);

    if (!translations) {
      translations = this.legacyNameDescriptionToTranslations(raw);
    }

    if (!translations || !Object.keys(translations).length) {
      return undefined;
    }

    const normalized: Record<string, ProvinceHighlightTranslationBlock> = {};
    for (const [langKey, block] of Object.entries(translations)) {
      const k = langKey.toLowerCase();
      const name = this.asNonEmptyStringFromUnknown(block.name);
      if (name) {
        const desc = this.asNonEmptyStringFromUnknown(block.description);
        normalized[k] = desc ? { name, description: desc } : { name };
      }
    }

    for (const code of requiredLangCodes) {
      if (!this.asNonEmptyStringFromUnknown(normalized[code]?.name)) {
        return undefined;
      }
    }

    const out: NormalizedHighlight = { translations: normalized };

    if (raw.thumbnail && typeof raw.thumbnail === 'object') {
      const thumb = raw.thumbnail as Record<string, unknown>;
      const url = this.asNonEmptyString(thumb.url);
      if (url) {
        out.thumbnail = {
          url,
          publicId: this.asNonEmptyString(thumb.publicId),
          alt: this.asNonEmptyString(thumb.alt),
          order: this.parseOptionalOrder(thumb.order),
        };
      } else {
        const alt = this.asNonEmptyString(thumb.alt);
        const order = this.parseOptionalOrder(thumb.order);
        if (alt !== undefined || order !== undefined) {
          out.thumbnail = { alt, order };
        }
      }
    }

    return out;
  }

  private parseTranslationsObject(
    trRaw: unknown,
  ): Record<string, { name?: unknown; description?: unknown }> | null {
    if (trRaw == null) return null;
    const tr = this.parseJsonIfString(trRaw);
    if (tr == null || typeof tr !== 'object' || Array.isArray(tr)) {
      return null;
    }
    const out: Record<string, { name?: unknown; description?: unknown }> = {};
    for (const [k, v] of Object.entries(tr as Record<string, unknown>)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        out[k.toLowerCase()] = { name: o.name, description: o.description };
      }
    }
    return Object.keys(out).length ? out : null;
  }

  private legacyNameDescriptionToTranslations(
    raw: Record<string, unknown>,
  ): Record<string, { name?: unknown; description?: unknown }> | null {
    const nameObj = raw.name;
    const descObj = raw.description;
    if (!nameObj && !descObj) return null;
    if (nameObj && typeof nameObj === 'object' && !Array.isArray(nameObj)) {
      const out: Record<string, { name?: unknown; description?: unknown }> = {};
      const n = nameObj as Record<string, unknown>;
      const d =
        descObj && typeof descObj === 'object' && !Array.isArray(descObj)
          ? (descObj as Record<string, unknown>)
          : {};
      const keys = new Set([...Object.keys(n), ...Object.keys(d)]);
      for (const k of keys) {
        out[k.toLowerCase()] = {
          name: n[k],
          description: d[k],
        };
      }
      return Object.keys(out).length ? out : null;
    }
    return null;
  }

  private parseOptionalOrder(value: unknown): number | undefined {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return Number.isNaN(n) ? undefined : n;
    }
    return undefined;
  }

  private sanitizeHighlightsForPersistence(
    items: NormalizedHighlight[],
  ): ProvinceHighlight[] {
    return items.map((h) => {
      const url = h.thumbnail && this.asNonEmptyString(h.thumbnail.url);
      const row: ProvinceHighlight = {
        translations: h.translations,
      };
      if (url && h.thumbnail) {
        row.thumbnail = {
          url,
          publicId: this.asNonEmptyString(h.thumbnail.publicId),
          alt: this.asNonEmptyString(h.thumbnail.alt),
          order: h.thumbnail.order,
        };
      }
      return row;
    });
  }

  private parseJsonIfString(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private asNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private asNonEmptyStringFromUnknown(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      return this.asNonEmptyString(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return this.asNonEmptyString(String(value));
    }
    return undefined;
  }
}

export interface ProvinceTravelCounts {
  totalHotels: number;
  totalTours: number;
  totalTourGuides: number;
}
