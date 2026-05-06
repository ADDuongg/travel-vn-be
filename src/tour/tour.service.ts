/* eslint-disable @typescript-eslint/no-base-to-string */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { NotFoundDomainException } from 'src/common/exceptions';
import { FilterQuery, SortOrder, Types } from 'mongoose';
import { CreateTourDto } from './dto/create-tour.dto';
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
  async create(
    dto: CreateTourDto,
    files?: Express.Multer.File[],
  ): Promise<Tour> {
    // Check slug uniqueness
    const existedSlug = await this.tourRepository.findOneBySlug(dto.slug);
    if (existedSlug) {
      throw new ConflictException('Tour slug already exists');
    }

    // Check code uniqueness
    const existedCode = await this.tourRepository.findOneByCode(dto.code);
    if (existedCode) {
      throw new ConflictException('Tour code already exists');
    }

    // Validate provinces
    const provinces = await this.provincesService.findAllForDropdown();
    const provinceIds = provinces.map((p: any) => String(p._id));

    const invalidDeparture = !provinceIds.includes(dto.departureProvinceId);
    if (invalidDeparture) {
      throw new BadRequestException('Invalid departure province');
    }

    const invalidDestinations = dto.destinations.some(
      (d) => !provinceIds.includes(d.provinceId),
    );
    if (invalidDestinations) {
      throw new BadRequestException('Invalid destination province(s)');
    }

    const { thumbnail, gallery } = await this.uploadGallery(files);

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
      thumbnail: thumbnail ?? undefined,
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

    return created;
  }

  /**
   * Find all tours with filters and pagination
   */
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
      throw new BadRequestException('Invalid tour ID');
    }

    const tour = await this.tourRepository.findByIdPopulated(id);

    if (!tour) {
      throw new NotFoundDomainException('Tour not found');
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
      throw new NotFoundDomainException('Tour not found');
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
  async update(
    id: string,
    dto: UpdateTourDto,
    files?: Express.Multer.File[],
  ): Promise<Tour> {
    const tour = await this.tourRepository.findById(id);
    if (!tour) {
      throw new NotFoundDomainException('Tour not found');
    }

    // Check slug uniqueness
    if (dto.slug !== undefined && dto.slug !== tour.slug) {
      const existedSlug = await this.tourRepository.findOneBySlug(dto.slug);
      if (existedSlug) {
        throw new ConflictException('Tour slug already exists');
      }
      tour.slug = dto.slug;
    }

    // Check code uniqueness
    if (dto.code !== undefined && dto.code !== tour.code) {
      const existedCode = await this.tourRepository.findOneByCode(dto.code);
      if (existedCode) {
        throw new ConflictException('Tour code already exists');
      }
      tour.code = dto.code;
    }

    // Update gallery/thumbnail when new files are uploaded
    if (files?.length) {
      await this.deleteGallery(tour.gallery || []);
      const uploaded = await this.uploadGallery(files);
      tour.thumbnail = uploaded.thumbnail ?? undefined;
      tour.gallery = uploaded.gallery;
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
      tour.capacity = dto.capacity as any;
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

    return saved;
  }

  /**
   * Delete tour (soft delete)
   */
  async delete(id: string): Promise<void> {
    const tour = await this.tourRepository.findById(id);
    if (!tour) {
      throw new NotFoundDomainException('Tour not found');
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

  private async uploadGallery(files?: Express.Multer.File[]) {
    let thumbnail: { url: string; publicId?: string; alt?: string } | null =
      null;
    const gallery: Array<{
      url: string;
      publicId?: string;
      alt?: string;
      order?: number;
    }> = [];

    if (files?.length) {
      for (let i = 0; i < files.length; i++) {
        const uploaded = await this.cloudinaryService.uploadFile(files[i], {
          folder: 'tours',
        });

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

  private async deleteGallery(
    gallery: Array<{ url?: string; publicId?: string }>,
  ) {
    if (!gallery?.length) return;

    await Promise.all(
      gallery.map((img) =>
        img.publicId
          ? this.cloudinaryService.deleteFile(img.publicId)
          : Promise.resolve(),
      ),
    );
  }
}
