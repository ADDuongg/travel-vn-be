import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Hotel, HotelDocument } from 'src/hotel/schema/hotel.schema';
import { TourGuide, TourGuideDocument } from 'src/tour-guide/schema/tour-guide.schema';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import { Province, ProvinceDocument } from './schema/province.schema';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { ProvinceQueryDto, ProvinceSortBy } from './dto/province-query.dto';

@Injectable()
export class ProvincesService {
  constructor(
    @InjectModel(Province.name)
    private readonly provinceModel: Model<ProvinceDocument>,
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    @InjectModel(TourGuide.name)
    private readonly tourGuideModel: Model<TourGuideDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
      filter.$or = [{ 'name.vi': regex }, { 'name.en': regex }];
    }

    let sortOption: Record<string, 1 | -1> = { 'name.vi': 1 };
    switch (sort) {
      case ProvinceSortBy.DISPLAY_ORDER:
        sortOption = { displayOrder: 1, 'name.vi': 1 };
        break;
      case ProvinceSortBy.NEWEST:
        sortOption = { createdAt: -1 };
        break;
      case ProvinceSortBy.NAME:
      default:
        sortOption = { 'name.vi': 1 };
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
    if (!province) throw new NotFoundException('Province not found');
    const [provinceWithCounts] = await this.attachCountsToProvinces([province]);
    return provinceWithCounts;
  }

  async findPopular() {
    return this.provinceModel
      .find({ isActive: true, isPopular: true })
      .select('-wards')
      .sort({ displayOrder: 1, 'name.vi': 1 })
      .lean();
  }

  /** Dropdown cho form: chi _id, code, slug, name, fullName, wards */
  findAllForDropdown() {
    return this.provinceModel
      .find({ type: 'province' })
      .select('_id code slug name fullName wards')
      .sort({ 'name.vi': 1 })
      .lean();
  }

  async update(
    id: string,
    dto: UpdateProvinceDto,
    files: Express.Multer.File[] = [],
  ) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');
    const thumbnailFile = files.find((file) => file.fieldname === 'thumbnail');
    const galleryFiles = files.filter((file) => file.fieldname === 'gallery');
    const highlightThumbnailFiles = files.filter(
      (file) =>
        file.fieldname === 'highlightsThumbnail' ||
        file.fieldname.startsWith('highlightsThumbnail_'),
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
      province.thumbnail = parsedThumbnail;
    }
    const parsedBestTimeToVisit = this.normalizeBestTimeToVisit(
      dto.bestTimeToVisit,
    );
    if (parsedBestTimeToVisit !== undefined) {
      province.bestTimeToVisit = parsedBestTimeToVisit;
    }
    const parsedHighlights = this.normalizeHighlights(dto.highlights);
    if (parsedHighlights !== undefined || highlightThumbnailFiles.length) {
      const baseHighlights =
        parsedHighlights ?? this.normalizeHighlights(province.highlights) ?? [];
      const highlightsWithUploadedThumbnail =
        await this.applyHighlightThumbnailsFromFiles(
          province,
          baseHighlights,
          highlightThumbnailFiles,
        );
      province.highlights = highlightsWithUploadedThumbnail;
    }

    if (dto.gallery !== undefined) {
      await this.deleteRemovedGalleryImages(province.gallery, dto.gallery);
      province.gallery = dto.gallery;
    }

    if (galleryFiles?.length) {
      const uploaded = await this.uploadGallery(galleryFiles);
      province.gallery = [...(province.gallery || []), ...uploaded];
    }

    if (thumbnailFile) {
      await this.applyThumbnail(province, thumbnailFile);
    }

    return province.save().then((p) => p.toObject());
  }

  async softDelete(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');
    province.isActive = false;
    await province.save();
    return { message: 'Province deactivated successfully' };
  }

  async restore(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');
    province.isActive = true;
    await province.save();
    return { message: 'Province restored successfully' };
  }

  async togglePopular(id: string) {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) throw new NotFoundException('Province not found');
    province.isPopular = !province.isPopular;
    return province.save().then((p) => p.toObject());
  }

  private async uploadGallery(
    files: Express.Multer.File[],
  ): Promise<
    Array<{ url: string; publicId?: string; alt?: string; order?: number }>
  > {
    if (!files?.length) return [];
    const result: Array<{
      url: string;
      publicId?: string;
      alt?: string;
      order?: number;
    }> = [];
    for (let i = 0; i < files.length; i++) {
      const uploaded = await this.cloudinaryService.uploadFile(files[i], {
        folder: 'provinces/gallery',
      });
      result.push({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        alt: files[i].originalname || undefined,
      });
    }
    return result;
  }

  private async applyThumbnail(
    province: ProvinceDocument,
    file: Express.Multer.File,
  ) {
    if (province.thumbnail?.publicId) {
      await this.cloudinaryService
        .deleteFile(province.thumbnail.publicId)
        .catch(() => {});
    }
    const result = await this.cloudinaryService.uploadFile(file, {
      folder: 'provinces/thumbnail',
    });
    province.thumbnail = {
      url: result.secure_url,
      publicId: result.public_id,
      alt: file.originalname || undefined,
    };
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

  private normalizeBestTimeToVisit(
    raw: unknown,
  ): { vi: string; en: string } | undefined {
    if (raw === undefined) return undefined;
    const parsed = this.parseJsonIfString(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;

    const vi = this.asNonEmptyString((parsed as Record<string, unknown>).vi);
    const en = this.asNonEmptyString((parsed as Record<string, unknown>).en);
    if (!vi || !en) return undefined;
    return { vi, en };
  }

  private normalizeThumbnail(
    raw: unknown,
  ):
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
  ):
    | Array<{
        name: { vi: string; en: string };
        thumbnail?: {
          url: string;
          publicId?: string;
          alt?: string;
          order?: number;
        };
        description?: { vi: string; en: string };
      }>
    | undefined {
    if (raw === undefined) return undefined;
    const parsed = this.parseJsonIfString(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => this.normalizeHighlightItem(item))
      .filter(
        (item): item is NonNullable<ReturnType<typeof this.normalizeHighlightItem>> =>
          Boolean(item),
      );
  }

  private normalizeHighlightItem(item: unknown):
    | {
        name: { vi: string; en: string };
        thumbnail?: {
          url: string;
          publicId?: string;
          alt?: string;
          order?: number;
        };
        description?: { vi: string; en: string };
      }
    | undefined {
    if (!item || typeof item !== 'object') return undefined;
    const raw = item as Record<string, unknown>;
    const normalizedName = this.normalizeLocalizedText(raw.name);
    if (!normalizedName) return undefined;

    const normalized: {
      name: { vi: string; en: string };
      thumbnail?: {
        url: string;
        publicId?: string;
        alt?: string;
        order?: number;
      };
      description?: { vi: string; en: string };
    } = {
      name: normalizedName,
    };

    const normalizedDescription = this.normalizeLocalizedText(raw.description);
    if (normalizedDescription) {
      normalized.description = normalizedDescription;
    }

    if (raw.thumbnail && typeof raw.thumbnail === 'object') {
      const thumb = raw.thumbnail as Record<string, unknown>;
      const url = this.asNonEmptyString(thumb.url);
      if (url) {
        normalized.thumbnail = {
          url,
          publicId: this.asNonEmptyString(thumb.publicId),
          alt: this.asNonEmptyString(thumb.alt),
          order:
            typeof thumb.order === 'number'
              ? thumb.order
              : typeof thumb.order === 'string' && thumb.order.trim() !== ''
                ? Number(thumb.order)
                : undefined,
        };
      }
    }

    return normalized;
  }

  private async applyHighlightThumbnailsFromFiles(
    province: ProvinceDocument,
    highlights: Array<{
      name: { vi: string; en: string };
      thumbnail?: {
        url: string;
        publicId?: string;
        alt?: string;
        order?: number;
      };
      description?: { vi: string; en: string };
    }>,
    files: Express.Multer.File[],
  ) {
    if (!files.length || !highlights.length) return highlights;
    const normalized = highlights.map((item) => ({ ...item }));
    const sequentialFiles = files.filter(
      (file) => file.fieldname === 'highlightsThumbnail',
    );
    const indexedFiles = files
      .map((file) => {
        const match = file.fieldname.match(/^highlightsThumbnail_(\d+)$/);
        return match ? { index: Number(match[1]), file } : undefined;
      })
      .filter(
        (
          value,
        ): value is {
          index: number;
          file: Express.Multer.File;
        } => Boolean(value),
      );

    const uploadAtIndex = async (index: number, file: Express.Multer.File) => {
      if (index < 0 || index >= normalized.length) return;
      const currentThumbnail = normalized[index].thumbnail;
      if (currentThumbnail?.publicId) {
        await this.cloudinaryService
          .deleteFile(currentThumbnail.publicId)
          .catch(() => {});
      }
      const uploaded = await this.cloudinaryService.uploadFile(file, {
        folder: 'provinces/highlights',
      });
      normalized[index].thumbnail = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        alt: file.originalname || undefined,
        order: currentThumbnail?.order,
      };
    };

    for (let index = 0; index < sequentialFiles.length; index++) {
      await uploadAtIndex(index, sequentialFiles[index]);
    }
    for (const item of indexedFiles) {
      await uploadAtIndex(item.index, item.file);
    }

    return normalized;
  }

  private normalizeLocalizedText(
    value: unknown,
  ): { vi: string; en: string } | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    const vi = this.asNonEmptyString(obj.vi);
    const en = this.asNonEmptyString(obj.en);
    if (!vi || !en) return undefined;
    return { vi, en };
  }

  private parseJsonIfString<T = unknown>(value: unknown): T | unknown {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value;
    }
  }

  private asNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
}

export interface ProvinceTravelCounts {
  totalHotels: number;
  totalTours: number;
  totalTourGuides: number;
}
