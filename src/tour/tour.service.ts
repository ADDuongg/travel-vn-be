import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourQueryDto, TourSortBy } from './dto/tour-query.dto';
import { Tour, TourDocument } from './schema/tour.schema';
import { ProvincesService } from 'src/provinces/provinces.service';

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
  constructor(
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
    private readonly provincesService: ProvincesService,
  ) {}

  /**
   * Create a new tour
   */
  async create(dto: CreateTourDto): Promise<Tour> {
    // Check slug uniqueness
    const existedSlug = await this.tourModel.findOne({ slug: dto.slug });
    if (existedSlug) {
      throw new ConflictException('Tour slug already exists');
    }

    // Check code uniqueness
    const existedCode = await this.tourModel.findOne({ code: dto.code });
    if (existedCode) {
      throw new ConflictException('Tour code already exists');
    }

    // Validate provinces
    const provinces = await this.provincesService.findAll();
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

    // Create tour
    return this.tourModel.create({
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
      bookingConfig: dto.bookingConfig ?? {},
      difficulty: dto.difficulty ?? 'MODERATE',
    });
  }

  /**
   * Find all tours with filters and pagination
   */
  async findAll(query: TourQueryDto) {
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
    const filter: any = { isActive: true };

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
    let sort: any = {};
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
    const [items, total] = await Promise.all([
      this.tourModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('destinations.provinceId', 'name code slug fullName')
        .populate('departureProvinceId', 'name code slug fullName')
        .populate('amenities')
        .lean(),
      this.tourModel.countDocuments(filter),
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

  /**
   * Find tour by ID
   */
  async findById(id: string): Promise<Tour> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tour ID');
    }

    const tour = await this.tourModel
      .findById(id)
      .populate('destinations.provinceId', 'name code slug fullName')
      .populate('departureProvinceId', 'name code slug fullName')
      .populate('amenities')
      .exec();

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    return tour;
  }

  /**
   * Find tour by slug
   */
  async findBySlug(slug: string): Promise<Tour> {
    const tour = await this.tourModel
      .findOne({ slug, isActive: true })
      .populate('destinations.provinceId', 'name code slug fullName')
      .populate('departureProvinceId', 'name code slug fullName')
      .populate('amenities')
      .exec();

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    return tour;
  }

  /**
   * Update tour
   */
  async update(id: string, dto: UpdateTourDto): Promise<Tour> {
    const tour = await this.tourModel.findById(id);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    // Check slug uniqueness
    if (dto.slug !== undefined && dto.slug !== tour.slug) {
      const existedSlug = await this.tourModel.findOne({ slug: dto.slug });
      if (existedSlug) {
        throw new ConflictException('Tour slug already exists');
      }
      tour.slug = dto.slug;
    }

    // Check code uniqueness
    if (dto.code !== undefined && dto.code !== tour.code) {
      const existedCode = await this.tourModel.findOne({ code: dto.code });
      if (existedCode) {
        throw new ConflictException('Tour code already exists');
      }
      tour.code = dto.code;
    }

    // Update fields
    if (dto.isActive !== undefined) tour.isActive = dto.isActive;
    if (dto.tourType !== undefined) tour.tourType = dto.tourType;
    if (dto.duration !== undefined) tour.duration = dto.duration;
    if (dto.translations !== undefined) tour.translations = dto.translations;
    if (dto.itinerary !== undefined) tour.itinerary = dto.itinerary as any;
    if (dto.capacity !== undefined) tour.capacity = dto.capacity as any;
    if (dto.pricing !== undefined) tour.pricing = dto.pricing as any;
    if (dto.contact !== undefined) tour.contact = dto.contact as any;
    if (dto.transportTypes !== undefined)
      tour.transportTypes = dto.transportTypes;
    if (dto.bookingConfig !== undefined)
      tour.bookingConfig = dto.bookingConfig as any;
    if (dto.difficulty !== undefined) tour.difficulty = dto.difficulty;

    if (dto.destinations !== undefined) {
      tour.destinations = dto.destinations.map((d) => ({
        provinceId: new Types.ObjectId(d.provinceId),
        isMainDestination: d.isMainDestination ?? false,
      })) as any;
    }

    if (dto.departureProvinceId !== undefined) {
      tour.departureProvinceId = new Types.ObjectId(dto.departureProvinceId);
    }

    if (dto.amenities !== undefined) {
      tour.amenities = dto.amenities.map((id) => new Types.ObjectId(id));
    }

    return tour.save();
  }

  /**
   * Delete tour (soft delete)
   */
  async delete(id: string): Promise<void> {
    const tour = await this.tourModel.findById(id);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    tour.isActive = false;
    await tour.save();
  }

  /**
   * Find all active tours for options/dropdown
   */
  async findAllActive(destinationId?: string): Promise<any[]> {
    const filter: any = { isActive: true };

    if (destinationId && Types.ObjectId.isValid(destinationId)) {
      filter['destinations.provinceId'] = new Types.ObjectId(destinationId);
    }

    return this.tourModel
      .find(filter)
      .select('_id slug code translations duration pricing')
      .sort({ 'translations.vi.name': 1 })
      .lean();
  }

  /**
   * Find featured tours
   */
  async findFeatured(limit: number = 6): Promise<Tour[]> {
    return this.tourModel
      .find({ isActive: true })
      .sort({ 'ratingSummary.average': -1, 'ratingSummary.total': -1 })
      .limit(limit)
      .populate('destinations.provinceId', 'name code slug')
      .populate('departureProvinceId', 'name code slug')
      .lean();
  }
}
