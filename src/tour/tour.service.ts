/* eslint-disable @typescript-eslint/no-base-to-string */
import { Injectable, Logger } from '@nestjs/common';
import { DomainException, NotFoundDomainException } from 'src/common/exceptions';
import { withI18nSuccess } from 'src/common/i18n/success-envelope';
import { TourI18nKeys } from './tour.i18n-keys';
import { FilterQuery, SortOrder, Types } from 'mongoose';
import {
  CreateTourDto,
  GalleryItemDto,
  ThumbnailRefDto,
} from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourQueryDto, TourSortBy } from './dto/tour-query.dto';
import { Tour, TourDocument } from './schema/tour.schema';
import { TourRepository } from './tour.repository';
import { ProvincesService } from 'src/provinces/provinces.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createDomainEventEnvelope } from 'src/common/events/domain-event';
import { CorrelationContextService } from 'src/common/correlation/correlation-context.service';
import { NotificationEvent } from 'src/notification/notification.constants';
import { TourNotificationEvent } from 'src/notification/events/tour-notification.event';
import { FavoriteService } from 'src/favorite/favorite.service';
import { FavoriteEntityType } from 'src/favorite/favorite.types';
import { TourSearchService } from './tour-search.service';
import { TourIndexQueueService } from './tour-index.queue';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import { ES_FALLBACK_TOTAL } from './tour-es.metrics';

type StoredThumbnail = { url: string; publicId?: string; alt?: string };
type StoredGalleryItem = StoredThumbnail & { order?: number };

/* interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
 */
@Injectable()
export class TourService {
  private readonly logger = new Logger(TourService.name);

  constructor(
    private readonly tourRepository: TourRepository,
    private readonly provincesService: ProvincesService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly correlationContext: CorrelationContextService,
    private readonly favoriteService: FavoriteService,
    private readonly tourSearch: TourSearchService,
    private readonly tourIndexQueue: TourIndexQueueService,
    @InjectMetric(ES_FALLBACK_TOTAL)
    private readonly esFallbackTotal: Counter<string>,
  ) {}

  private emitNotificationEvent<TPayload>(
    eventName: NotificationEvent,
    payload: TPayload,
  ) {
    this.eventEmitter.emit(
      String(eventName),
      createDomainEventEnvelope({
        eventName: String(eventName),
        source: TourService.name,
        requestId: this.correlationContext.getRequestId(),
        payload,
      }),
    );
  }

  /**
   * Create a new tour
   */
  async create(dto: CreateTourDto) {
    // Check slug uniqueness
    const existedSlug = await this.tourRepository.findOneBySlug(dto.slug);
    if (existedSlug) {
      throw new DomainException(
        'Tour slug already exists',
        409,
        'TOUR_SLUG_EXISTS',
        TourI18nKeys.slugExists,
      );
    }

    // Check code uniqueness
    const existedCode = await this.tourRepository.findOneByCode(dto.code);
    if (existedCode) {
      throw new DomainException(
        'Tour code already exists',
        409,
        'TOUR_CODE_EXISTS',
        TourI18nKeys.codeExists,
      );
    }

    // Validate provinces
    const provinces = await this.provincesService.findAllForDropdown();
    const provinceIds = provinces.map((p: any) => String(p._id));

    const invalidDeparture = !provinceIds.includes(dto.departureProvinceId);
    if (invalidDeparture) {
      throw new DomainException(
        'Invalid departure province',
        400,
        'INVALID_DEPARTURE_PROVINCE',
        TourI18nKeys.invalidDepartureProvince,
      );
    }

    const invalidDestinations = dto.destinations.some(
      (d) => !provinceIds.includes(d.provinceId),
    );
    if (invalidDestinations) {
      throw new DomainException(
        'Invalid destination province(s)',
        400,
        'INVALID_DESTINATION_PROVINCES',
        TourI18nKeys.invalidDestinationProvinces,
      );
    }

    const gallery = this.normalizeGallery(dto.gallery);
    const thumbnail = this.resolveThumbnail(dto.thumbnail, gallery);

    // Create tour
    const created = await this.tourRepository.create({
      slug: dto.slug,
      code: dto.code,
      isActive: dto.isActive ?? true,
      tourType: dto.tourType,
      duration: dto.duration,
      destinations: dto.destinations.map((d) => ({
        provinceId: new Types.ObjectId(d.provinceId),
        isMainDestination: d.isMainDestination ?? false,
      })),
      departureProvinceId: new Types.ObjectId(dto.departureProvinceId),
      translations: dto.translations,
      itinerary: dto.itinerary ?? [],
      capacity: {
        minGuests: dto.capacity.minGuests ?? 1,
        maxGuests: dto.capacity.maxGuests,
        privateAvailable: dto.capacity.privateAvailable ?? false,
      },
      pricing: {
        basePrice: dto.pricing.basePrice,
        currency: dto.pricing.currency ?? 'VND',
        childPrice: dto.pricing.childPrice,
        infantPrice: dto.pricing.infantPrice,
        singleSupplement: dto.pricing.singleSupplement,
      },
      contact: dto.contact,
      amenities: dto.amenities?.map((id) => new Types.ObjectId(id)) ?? [],
      transportTypes: dto.transportTypes ?? [],
      bookingConfig: (dto.bookingConfig ?? {}) as Tour['bookingConfig'],
      difficulty: dto.difficulty ?? 'MODERATE',
      sale: dto.sale?.isActive ? dto.sale : undefined,
      schedule: dto.schedule,
      thumbnail,
      gallery,
    });

    const viName = dto.translations?.vi?.name;
    const enName = dto.translations?.en?.name;
    const tourName = viName || enName;

    this.emitNotificationEvent(
      NotificationEvent.TOUR_CREATED,
      new TourNotificationEvent(String(created._id), created.code, tourName),
    );

    if (this.tourSearch.isUsable()) {
      void this.tourIndexQueue.enqueue(String(created._id), 'create', {
        requestId: this.correlationContext.getRequestId(),
      });
    }

    return withI18nSuccess(
      created,
      'Tour created successfully',
      TourI18nKeys.created,
    );
  }
  async findAll(query: TourQueryDto, userId?: string) {
    if (this.tourSearch.canServeSearch()) {
      this.logger.log('🚀 USING ELASTICSEARCH');
      try {
        return await this.findAllFromElasticsearch(query, userId);
      } catch (err) {
        this.logger.warn(
          `Elasticsearch tour list failed, using MongoDB fallback: ${err instanceof Error ? err.message : String(err)}`,
        );
        this.esFallbackTotal.inc({ reason: 'search_error' });
      }
    } else if (this.tourSearch.isUsable()) {
      this.logger.warn(
        'Elasticsearch tours index is not ready (bootstrap/mapping), using MongoDB fallback for tour list',
      );
      this.esFallbackTotal.inc({ reason: 'index_not_ready' });
    }
    this.logger.log('🚀 USING MONGODB');
    return this.findAllFromMongo(query, userId);
  }

  private async findAllFromElasticsearch(query: TourQueryDto, userId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const { ids, total } = await this.tourSearch.search(query);

    if (ids.length === 0) {
      return {
        items: [] as unknown[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0,
        },
      };
    }

    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const rows = await this.tourRepository.findManyByIdsOrderedPopulate(
      objectIds,
    );

    let enrichedItems: unknown[] = rows;
    if (userId) {
      const favSet = await this.favoriteService.existsByUserAndEntities({
        userId,
        pairs: rows.map((t) => ({
          entityType: FavoriteEntityType.TOUR,
          entityId: String(t._id),
        })),
      });
      enrichedItems = rows.map((t) => ({
        ...t,
        isFavorited: favSet.has(`${FavoriteEntityType.TOUR}:${String(t._id)}`),
      }));
    }

    return {
      items: enrichedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  private async findAllFromMongo(query: TourQueryDto, userId?: string) {
    const {
      page = 1,
      limit = 12,
      destinationId,
      departureProvinceId,
      tourType,
      minDays,
      maxDays,
      minPrice,
      maxPrice,
      difficulty,
      sortBy = TourSortBy.NEWEST,
      search,
      transportTypes,
    } = query;

    // Build filter
    const filter: FilterQuery<TourDocument> = { isActive: true };

    if (destinationId && Types.ObjectId.isValid(destinationId)) {
      filter['destinations.provinceId'] = new Types.ObjectId(destinationId);
    }

    if (departureProvinceId && Types.ObjectId.isValid(departureProvinceId)) {
      filter.departureProvinceId = new Types.ObjectId(departureProvinceId);
    }

    if (tourType) {
      filter.tourType = tourType;
    }

    if (minDays || maxDays) {
      filter['duration.days'] = {};
      if (minDays) filter['duration.days'].$gte = minDays;
      if (maxDays) filter['duration.days'].$lte = maxDays;
    }

    if (minPrice || maxPrice) {
      filter['pricing.basePrice'] = {};
      if (minPrice) filter['pricing.basePrice'].$gte = minPrice;
      if (maxPrice) filter['pricing.basePrice'].$lte = maxPrice;
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    if (transportTypes && transportTypes.length > 0) {
      filter.transportTypes = { $in: transportTypes };
    }

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { 'translations.vi.name': { $regex: search, $options: 'i' } },
        { 'translations.en.name': { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    let sort: Record<string, SortOrder> = {};
    switch (sortBy) {
      case TourSortBy.PRICE_ASC:
        sort = { 'pricing.basePrice': 1 };
        break;
      case TourSortBy.PRICE_DESC:
        sort = { 'pricing.basePrice': -1 };
        break;
      case TourSortBy.DURATION_ASC:
        sort = { 'duration.days': 1 };
        break;
      case TourSortBy.DURATION_DESC:
        sort = { 'duration.days': -1 };
        break;
      case TourSortBy.RATING:
        sort = { 'ratingSummary.average': -1, 'ratingSummary.total': -1 };
        break;
      case TourSortBy.NEWEST:
      default:
        sort = { createdAt: -1 };
        break;
    }

    // Execute query
    const skip = (page - 1) * limit;
    const [items, total] = await this.tourRepository.findPageMongo({
      filter,
      sort,
      skip,
      limit,
    });

    let enrichedItems: any[] = items;
    if (userId) {
      const favSet = await this.favoriteService.existsByUserAndEntities({
        userId,
        pairs: items.map((t: any) => ({
          entityType: FavoriteEntityType.TOUR,
          entityId: String(t._id),
        })),
      });
      enrichedItems = items.map((t: any) => ({
        ...t,
        isFavorited: favSet.has(`${FavoriteEntityType.TOUR}:${String(t._id)}`),
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

  /**
   * Find tour by ID
   */
  async findById(id: string, userId?: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new DomainException(
        'Invalid tour ID',
        400,
        'INVALID_TOUR_ID',
        TourI18nKeys.invalidTourId,
      );
    }

    const tour = await this.tourRepository.findByIdPopulated(id);

    if (!tour) {
      throw new NotFoundDomainException(
        'Tour not found',
        'TOUR_NOT_FOUND',
        TourI18nKeys.notFound,
      );
    }

    const obj = tour.toObject();
    if (!userId) return obj;
    const isFavorited = await this.favoriteService.isFavorited({
      userId,
      entityType: FavoriteEntityType.TOUR,
      entityId: id,
    });
    return { ...obj, isFavorited: isFavorited.isFavorited };
  }

  /**
   * Find tour by slug
   */
  async findBySlug(slug: string, userId?: string): Promise<any> {
    const tour = await this.tourRepository.findOneActiveBySlug(slug);

    if (!tour) {
      throw new NotFoundDomainException(
        'Tour not found',
        'TOUR_NOT_FOUND',
        TourI18nKeys.notFound,
      );
    }

    const obj = tour.toObject();
    if (!userId) return obj;
    const isFavorited = await this.favoriteService.isFavorited({
      userId,
      entityType: FavoriteEntityType.TOUR,
      entityId: String(tour._id),
    });
    return { ...obj, isFavorited: isFavorited.isFavorited };
  }

  /**
   * Update tour
   */
  async update(id: string, dto: UpdateTourDto) {
    const tour = await this.tourRepository.findById(id);
    if (!tour) {
      throw new NotFoundDomainException(
        'Tour not found',
        'TOUR_NOT_FOUND',
        TourI18nKeys.notFound,
      );
    }

    // Check slug uniqueness
    if (dto.slug !== undefined && dto.slug !== tour.slug) {
      const existedSlug = await this.tourRepository.findOneBySlug(dto.slug);
      if (existedSlug) {
        throw new DomainException(
          'Tour slug already exists',
          409,
          'TOUR_SLUG_EXISTS',
          TourI18nKeys.slugExists,
        );
      }
      tour.slug = dto.slug;
    }

    // Check code uniqueness
    if (dto.code !== undefined && dto.code !== tour.code) {
      const existedCode = await this.tourRepository.findOneByCode(dto.code);
      if (existedCode) {
        throw new DomainException(
          'Tour code already exists',
          409,
          'TOUR_CODE_EXISTS',
          TourI18nKeys.codeExists,
        );
      }
      tour.code = dto.code;
    }

    if (dto.departureProvinceId !== undefined || dto.destinations !== undefined) {
      const provinces = await this.provincesService.findAllForDropdown();
      const provinceIds = provinces.map((p: any) => String(p._id));

      if (
        dto.departureProvinceId !== undefined &&
        !provinceIds.includes(dto.departureProvinceId)
      ) {
        throw new DomainException(
          'Invalid departure province',
          400,
          'INVALID_DEPARTURE_PROVINCE',
          TourI18nKeys.invalidDepartureProvince,
        );
      }

      if (
        dto.destinations !== undefined &&
        dto.destinations.some((d) => !provinceIds.includes(d.provinceId))
      ) {
        throw new DomainException(
          'Invalid destination province(s)',
          400,
          'INVALID_DESTINATION_PROVINCES',
          TourI18nKeys.invalidDestinationProvinces,
        );
      }
    }

    const prevGallery = (tour.gallery ?? []) as StoredGalleryItem[];
    const prevThumbnail = tour.thumbnail as StoredThumbnail | undefined;

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
      tour.thumbnail = nextThumbnail;
      tour.gallery = nextGallery;
    }

    // Update fields
    const prevIsActive = tour.isActive;

    if (dto.isActive !== undefined) tour.isActive = dto.isActive;
    if (dto.tourType !== undefined) tour.tourType = dto.tourType;
    if (dto.duration !== undefined) {
      tour.duration = dto.duration as any;
    }
    if (dto.translations !== undefined) {
      tour.translations = dto.translations as any;
    }
    if (dto.itinerary !== undefined) {
      tour.itinerary = dto.itinerary as any;
    }
    if (dto.capacity !== undefined) {
      tour.capacity = {
        minGuests: dto.capacity.minGuests ?? tour.capacity.minGuests ?? 1,
        maxGuests: dto.capacity.maxGuests,
        privateAvailable:
          dto.capacity.privateAvailable ?? tour.capacity.privateAvailable ?? false,
      } as any;
    }
    if (dto.pricing !== undefined) {
      tour.pricing = dto.pricing as any;
    }
    if (dto.contact !== undefined) {
      tour.contact = dto.contact as any;
    }
    if (dto.transportTypes !== undefined) {
      tour.transportTypes = dto.transportTypes;
    }
    if (dto.bookingConfig !== undefined) {
      tour.bookingConfig = dto.bookingConfig as any;
    }
    if (dto.difficulty !== undefined) tour.difficulty = dto.difficulty;

    if (dto.destinations !== undefined) {
      tour.destinations = dto.destinations.map((d) => ({
        provinceId: new Types.ObjectId(d.provinceId),
        isMainDestination: d.isMainDestination ?? false,
      }));
    }

    if (dto.departureProvinceId !== undefined) {
      tour.departureProvinceId = new Types.ObjectId(dto.departureProvinceId);
    }

    if (dto.amenities !== undefined) {
      tour.amenities = dto.amenities.map(
        (id: string) => new Types.ObjectId(id),
      );
    }

    if (dto.sale !== undefined) {
      tour.sale = dto.sale?.isActive ? dto.sale : undefined;
    }

    if (dto.schedule !== undefined) {
      tour.schedule = dto.schedule as any;
    }

    const saved = await tour.save();

    const viName = saved.translations?.vi?.name;
    const enName = saved.translations?.en?.name;
    const tourName = viName || enName;

    this.emitNotificationEvent(
      NotificationEvent.TOUR_UPDATED,
      new TourNotificationEvent(String(saved._id), saved.code, tourName),
    );

    if (dto.isActive !== undefined && dto.isActive !== prevIsActive) {
      const eventName = dto.isActive
        ? NotificationEvent.TOUR_CREATED
        : NotificationEvent.TOUR_DELETED;
      this.emitNotificationEvent(
        eventName,
        new TourNotificationEvent(
          String(saved._id),
          saved.code,
          tourName,
          dto.isActive,
        ),
      );
    }

    if (this.tourSearch.isUsable()) {
      void this.tourIndexQueue.enqueue(String(saved._id), 'update', {
        requestId: this.correlationContext.getRequestId(),
      });
    }

    return withI18nSuccess(
      saved,
      'Tour updated successfully',
      TourI18nKeys.updated,
    );
  }
  async delete(id: string): Promise<void> {
    const tour = await this.tourRepository.findById(id);
    if (!tour) {
      throw new NotFoundDomainException(
        'Tour not found',
        'TOUR_NOT_FOUND',
        TourI18nKeys.notFound,
      );
    }

    tour.isActive = false;
    await tour.save();

    const viName = tour.translations?.vi?.name;
    const enName = tour.translations?.en?.name;
    const tourName = viName || enName;

    this.emitNotificationEvent(
      NotificationEvent.TOUR_DELETED,
      new TourNotificationEvent(String(tour._id), tour.code, tourName, false),
    );

    if (this.tourSearch.isUsable()) {
      void this.tourIndexQueue.enqueue(String(tour._id), 'delete', {
        requestId: this.correlationContext.getRequestId(),
      });
    }
  }

  /**
   * Find all active tours for options/dropdown
   */
  async findAllActive(destinationId?: string): Promise<any[]> {
    const filter: FilterQuery<TourDocument> = { isActive: true };

    if (destinationId && Types.ObjectId.isValid(destinationId)) {
      filter['destinations.provinceId'] = new Types.ObjectId(destinationId);
    }

    return this.tourRepository.findActiveForOptions(filter);
  }

  /**
   * Find featured tours
   */
  async findFeatured(limit: number = 6, userId?: string): Promise<any[]> {
    const items = await this.tourRepository.findFeatured(limit);
    if (!userId) return items;
    const favSet = await this.favoriteService.existsByUserAndEntities({
      userId,
      pairs: items.map((t: any) => ({
        entityType: FavoriteEntityType.TOUR,
        entityId: String(t._id),
      })),
    });
    return items.map((t: any) => ({
      ...t,
      isFavorited: favSet.has(`${FavoriteEntityType.TOUR}:${String(t._id)}`),
    }));
  }

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
