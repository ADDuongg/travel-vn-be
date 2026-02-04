# Tour Module - Implementation Plan

## 📋 Tổng quan

Module quản lý tour du lịch với đầy đủ tính năng: thông tin tour, lịch trình, giá cả, booking, và đánh giá.

**Patterns áp dụng:**
- Multi-language translations (vi, en, ...)
- Province relationships (destinations)
- Media management (Cloudinary)
- Amenities/Inclusions/Exclusions
- Pricing & Sale/Discount
- Rating summary
- Soft delete (isActive flag)

---

## 🏗️ PHẦN I: CƠ BẢN (MVP)

### 1. Cấu trúc thư mục

```
src/tour/
├── tour.module.ts
├── tour.controller.ts
├── tour.service.ts
├── tour.types.ts
├── dto/
│   ├── create-tour.dto.ts
│   ├── update-tour.dto.ts
│   └── tour-query.dto.ts
└── schema/
    └── tour.schema.ts
```

---

### 2. Schema Design (`tour.schema.ts`)

#### 2.1 Sub-schemas

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Province } from 'src/provinces/schema/province.schema';

export type TourDocument = Tour & Document;

/* =======================
   SUB SCHEMAS
======================= */

// Lịch trình từng ngày
@Schema({ _id: false })
export class TourItineraryDay {
  @Prop({ required: true })
  dayNumber: number;

  @Prop({ type: Object })
  translations: {
    [langCode: string]: {
      title: string;
      description: string;
      meals?: string[];
      accommodation?: string;
    };
  };
}

export const TourItineraryDaySchema = SchemaFactory.createForClass(TourItineraryDay);

// Địa điểm tour đi qua
@Schema({ _id: false })
export class TourDestination {
  @Prop({ type: Types.ObjectId, ref: Province.name, required: true })
  provinceId: Types.ObjectId;

  @Prop({ default: false })
  isMainDestination: boolean;
}

export const TourDestinationSchema = SchemaFactory.createForClass(TourDestination);

// Thông tin liên hệ
@Schema({ _id: false })
export class TourContact {
  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  hotline?: string;
}

export const TourContactSchema = SchemaFactory.createForClass(TourContact);

// Giá tour
@Schema({ _id: false })
export class TourPricing {
  @Prop({ required: true })
  basePrice: number;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop()
  childPrice?: number;

  @Prop()
  infantPrice?: number;

  @Prop()
  singleSupplement?: number;
}

export const TourPricingSchema = SchemaFactory.createForClass(TourPricing);
```

#### 2.2 Main Schema

```typescript
/* =======================
   TOUR SCHEMA
======================= */

@Schema({
  collection: 'tours',
  timestamps: true,
})
export class Tour {
  /* ================= CORE ================= */

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, enum: ['DOMESTIC', 'INTERNATIONAL', 'DAILY'] })
  tourType: string;

  /* ================= DURATION ================= */

  @Prop({
    type: {
      days: { type: Number, required: true },
      nights: { type: Number, required: true },
    },
    required: true,
  })
  duration: {
    days: number;
    nights: number;
  };

  /* ================= DESTINATIONS ================= */

  @Prop({
    type: [TourDestinationSchema],
    required: true,
  })
  destinations: TourDestination[];

  @Prop({
    type: Types.ObjectId,
    ref: Province.name,
    required: true,
    index: true,
  })
  departureProvinceId: Types.ObjectId;

  /* ================= TRANSLATIONS ================= */

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  translations: {
    [langCode: string]: {
      name: string;
      description?: string;
      shortDescription?: string;
      highlights?: string[];
      inclusions?: string[];
      exclusions?: string[];
      notes?: string[];
      cancellationPolicy?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    };
  };

  /* ================= ITINERARY ================= */

  @Prop({
    type: [TourItineraryDaySchema],
    default: [],
  })
  itinerary: TourItineraryDay[];

  /* ================= CAPACITY ================= */

  @Prop({
    type: {
      minGuests: { type: Number, default: 1 },
      maxGuests: { type: Number, required: true },
      privateAvailable: { type: Boolean, default: false },
    },
    required: true,
  })
  capacity: {
    minGuests: number;
    maxGuests: number;
    privateAvailable: boolean;
  };

  /* ================= PRICING ================= */

  @Prop({ type: TourPricingSchema, required: true })
  pricing: TourPricing;

  /* ================= CONTACT ================= */

  @Prop({ type: TourContactSchema })
  contact?: TourContact;

  /* ================= MEDIA ================= */

  @Prop({
    type: {
      url: String,
      publicId: String,
      alt: String,
    },
  })
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };

  @Prop({
    type: [
      {
        url: String,
        publicId: String,
        alt: String,
        order: Number,
      },
    ],
    default: [],
  })
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;

  /* ================= AMENITIES / TRANSPORT ================= */

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Amenity' }],
    default: [],
  })
  amenities: Types.ObjectId[];

  @Prop({
    type: [String],
    default: [],
  })
  transportTypes: string[];

  /* ================= BOOKING CONFIG ================= */

  @Prop({
    type: {
      advanceBookingDays: { type: Number, default: 1 },
      allowInstantBooking: { type: Boolean, default: true },
      requireDeposit: { type: Boolean, default: true },
      depositPercent: { type: Number, default: 30 },
    },
    default: {},
  })
  bookingConfig: {
    advanceBookingDays: number;
    allowInstantBooking: boolean;
    requireDeposit: boolean;
    depositPercent: number;
  };

  /* ================= SALE / DISCOUNT ================= */

  @Prop({
    type: Object,
    default: {},
  })
  sale?: {
    isActive: boolean;
    type: 'PERCENT' | 'FIXED';
    value: number;
    startDate?: Date;
    endDate?: Date;
  };

  /* ================= RATING ================= */

  @Prop({
    type: {
      average: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    default: {},
  })
  ratingSummary: {
    average: number;
    total: number;
  };

  /* ================= SCHEDULE (Ngày khởi hành) ================= */

  @Prop({
    type: {
      departureDays: [String],
      fixedDepartures: [
        {
          date: Date,
          availableSlots: Number,
          status: String,
        },
      ],
    },
    default: {},
  })
  schedule: {
    departureDays?: string[];
    fixedDepartures?: Array<{
      date: Date;
      availableSlots: number;
      status: string;
    }>;
  };

  /* ================= DIFFICULTY ================= */

  @Prop({
    type: String,
    enum: ['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'],
    default: 'MODERATE',
  })
  difficulty: string;
}

export const TourSchema = SchemaFactory.createForClass(Tour);

/* ================= INDEXES ================= */

TourSchema.index({ slug: 1 }, { unique: true });
TourSchema.index({ code: 1 }, { unique: true });
TourSchema.index({ isActive: 1 });
TourSchema.index({ tourType: 1 });
TourSchema.index({ 'destinations.provinceId': 1 });
TourSchema.index({ departureProvinceId: 1 });
TourSchema.index({ 'pricing.basePrice': 1 });
TourSchema.index({ 'duration.days': 1 });
TourSchema.index({ isActive: 1, tourType: 1 });
TourSchema.index({ 'destinations.provinceId': 1, isActive: 1 });
TourSchema.index({ 'ratingSummary.average': -1 });
TourSchema.index({ createdAt: -1 });
```

---

### 3. DTOs

#### 3.1 Sub DTOs (`create-tour.dto.ts`)

```typescript
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TransformValue } from 'src/utils/transform.util';

/* =======================
   SUB DTOs
======================= */

export class TourItineraryDayTranslationDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meals?: string[];

  @IsOptional()
  @IsString()
  accommodation?: string;
}

export class TourItineraryDayDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @IsObject()
  translations: Record<string, TourItineraryDayTranslationDto>;
}

export class TourDestinationDto {
  @IsMongoId()
  provinceId: string;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  isMainDestination?: boolean;
}

export class TourContactDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  hotline?: string;
}

export class TourPricingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  childPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  infantPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  singleSupplement?: number;
}

export class TourDurationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  nights: number;
}

export class TourCapacityDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minGuests?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxGuests: number;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  privateAvailable?: boolean;
}

export class TourBookingConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceBookingDays?: number;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  allowInstantBooking?: boolean;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  requireDeposit?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercent?: number;
}

export class TourSeoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class TourTranslationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TourSeoDto)
  seo?: TourSeoDto;
}
```

#### 3.2 Create Tour DTO

```typescript
/* =======================
   MAIN DTO
======================= */

export class CreateTourDto {
  @IsString()
  slug: string;

  @IsString()
  code: string;

  @TransformValue()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @IsEnum(['DOMESTIC', 'INTERNATIONAL', 'DAILY'])
  tourType: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourDurationDto)
  duration: TourDurationDto;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourDestinationDto)
  destinations: TourDestinationDto[];

  @IsMongoId()
  departureProvinceId: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsObject()
  translations: Record<string, TourTranslationDto>;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourItineraryDayDto)
  itinerary?: TourItineraryDayDto[];

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourCapacityDto)
  capacity: TourCapacityDto;

  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourPricingDto)
  pricing: TourPricingDto;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourContactDto)
  contact?: TourContactDto;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @IsMongoId({ each: true })
  amenities?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsArray()
  @IsString({ each: true })
  transportTypes?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @ValidateNested()
  @Type(() => TourBookingConfigDto)
  bookingConfig?: TourBookingConfigDto;

  @IsOptional()
  @IsString()
  @IsEnum(['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'])
  difficulty?: string;
}
```

#### 3.3 Update Tour DTO

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateTourDto } from './create-tour.dto';

export class UpdateTourDto extends PartialType(CreateTourDto) {}
```

#### 3.4 Query DTO (`tour-query.dto.ts`)

```typescript
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum TourSortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  DURATION_ASC = 'duration_asc',
  DURATION_DESC = 'duration_desc',
  RATING = 'rating',
  NEWEST = 'newest',
}

export class TourQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsMongoId()
  destinationId?: string;

  @IsOptional()
  @IsMongoId()
  departureProvinceId?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['DOMESTIC', 'INTERNATIONAL', 'DAILY'])
  tourType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['EASY', 'MODERATE', 'CHALLENGING', 'DIFFICULT'])
  difficulty?: string;

  @IsOptional()
  @IsEnum(TourSortBy)
  sortBy?: TourSortBy = TourSortBy.NEWEST;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsString({ each: true })
  transportTypes?: string[];
}
```

---

### 4. Service (`tour.service.ts`)

```typescript
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

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
  async findAll(query: TourQueryDto): Promise<PaginatedResult<Tour>> {
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
```

---

### 5. Controller (`tour.controller.ts`)

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourQueryDto } from './dto/tour-query.dto';

@Controller('api/v1/tours')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Post()
  create(@Body() dto: CreateTourDto) {
    return this.tourService.create(dto);
  }

  @Get()
  findAll(@Query() query: TourQueryDto) {
    return this.tourService.findAll(query);
  }

  @Get('options')
  getOptions(@Query('destinationId') destinationId?: string) {
    return this.tourService.findAllActive(destinationId);
  }

  @Get('featured')
  getFeatured(@Query('limit') limit?: number) {
    return this.tourService.findFeatured(limit);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tourService.findBySlug(slug);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tourService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTourDto) {
    return this.tourService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tourService.delete(id);
  }
}
```

---

### 6. Module (`tour.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourController } from './tour.controller';
import { TourService } from './tour.service';
import { Tour, TourSchema } from './schema/tour.schema';
import { ProvincesModule } from 'src/provinces/provinces.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }]),
    ProvincesModule,
  ],
  controllers: [TourController],
  providers: [TourService],
  exports: [TourService],
})
export class TourModule {}
```

---

### 7. Types (`tour.types.ts`)

```typescript
/**
 * Frontend types for Tour module
 */

export interface TourTranslation {
  name: string;
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  notes?: string[];
  cancellationPolicy?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface TourItineraryDayTranslation {
  title: string;
  description: string;
  meals?: string[];
  accommodation?: string;
}

export interface TourItineraryDay {
  dayNumber: number;
  translations: Record<string, TourItineraryDayTranslation>;
}

export interface TourDestination {
  provinceId: string | any;
  isMainDestination: boolean;
}

export interface TourContact {
  phone?: string;
  email?: string;
  hotline?: string;
}

export interface TourPricing {
  basePrice: number;
  currency: string;
  childPrice?: number;
  infantPrice?: number;
  singleSupplement?: number;
}

export interface TourDuration {
  days: number;
  nights: number;
}

export interface TourCapacity {
  minGuests: number;
  maxGuests: number;
  privateAvailable: boolean;
}

export interface TourBookingConfig {
  advanceBookingDays: number;
  allowInstantBooking: boolean;
  requireDeposit: boolean;
  depositPercent: number;
}

export interface TourSale {
  isActive: boolean;
  type: 'PERCENT' | 'FIXED';
  value: number;
  startDate?: Date;
  endDate?: Date;
}

export interface TourRatingSummary {
  average: number;
  total: number;
}

export interface TourSchedule {
  departureDays?: string[];
  fixedDepartures?: Array<{
    date: Date;
    availableSlots: number;
    status: string;
  }>;
}

export interface Tour {
  _id: string;
  slug: string;
  code: string;
  isActive: boolean;
  tourType: 'DOMESTIC' | 'INTERNATIONAL' | 'DAILY';
  duration: TourDuration;
  destinations: TourDestination[];
  departureProvinceId: string | any;
  translations: Record<string, TourTranslation>;
  itinerary: TourItineraryDay[];
  capacity: TourCapacity;
  pricing: TourPricing;
  contact?: TourContact;
  thumbnail?: {
    url: string;
    publicId?: string;
    alt?: string;
  };
  gallery: Array<{
    url: string;
    publicId?: string;
    alt?: string;
    order?: number;
  }>;
  amenities: string[] | any[];
  transportTypes: string[];
  bookingConfig: TourBookingConfig;
  sale?: TourSale;
  ratingSummary: TourRatingSummary;
  schedule: TourSchedule;
  difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'DIFFICULT';
  createdAt: Date;
  updatedAt: Date;
}

export interface TourQueryParams {
  page?: number;
  limit?: number;
  destinationId?: string;
  departureProvinceId?: string;
  tourType?: string;
  minDays?: number;
  maxDays?: number;
  minPrice?: number;
  maxPrice?: number;
  difficulty?: string;
  sortBy?: string;
  search?: string;
  transportTypes?: string[];
}

export interface TourPaginatedResponse {
  items: Tour[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

### 8. Checklist Implementation MVP

| # | Task | Estimated Time |
|---|------|----------------|
| 1 | Tạo `schema/tour.schema.ts` với sub-schemas | 30-45 phút |
| 2 | Tạo `dto/create-tour.dto.ts` (all sub-DTOs) | 30-45 phút |
| 3 | Tạo `dto/update-tour.dto.ts` | 5 phút |
| 4 | Tạo `dto/tour-query.dto.ts` | 15-20 phút |
| 5 | Tạo `tour.service.ts` (CRUD + queries) | 45-60 phút |
| 6 | Tạo `tour.controller.ts` | 15-20 phút |
| 7 | Tạo `tour.module.ts` | 10 phút |
| 8 | Tạo `tour.types.ts` | 20-30 phút |
| 9 | Register `TourModule` trong `app.module.ts` | 5 phút |
| 10 | Test API endpoints với Postman/Insomnia | 30-45 phút |

**Tổng thời gian ước tính:** 3-4 giờ

---

### 9. API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tours` | Tạo tour mới |
| GET | `/api/v1/tours` | Lấy danh sách tours (có filter, sort, pagination) |
| GET | `/api/v1/tours/options` | Lấy options cho dropdown |
| GET | `/api/v1/tours/featured` | Lấy tours nổi bật |
| GET | `/api/v1/tours/slug/:slug` | Lấy tour theo slug |
| GET | `/api/v1/tours/:id` | Lấy tour theo ID |
| PATCH | `/api/v1/tours/:id` | Cập nhật tour |
| DELETE | `/api/v1/tours/:id` | Xóa tour (soft delete) |

---

### 10. Sample API Response

```json
{
  "_id": "675abc123def456789012345",
  "slug": "sapa-3-ngay-2-dem",
  "code": "TOUR-SAPA-001",
  "tourType": "DOMESTIC",
  "duration": {
    "days": 3,
    "nights": 2
  },
  "destinations": [
    {
      "provinceId": {
        "_id": "...",
        "name": "Lào Cai",
        "code": "25",
        "slug": "lao-cai"
      },
      "isMainDestination": true
    }
  ],
  "departureProvinceId": {
    "_id": "...",
    "name": "Hà Nội",
    "code": "01",
    "slug": "ha-noi"
  },
  "translations": {
    "vi": {
      "name": "Tour Sapa 3 ngày 2 đêm - Khám phá vùng cao Tây Bắc",
      "shortDescription": "Chinh phục Fansipan, tham quan bản làng người H'Mông",
      "highlights": [
        "Chinh phục đỉnh Fansipan bằng cáp treo",
        "Tham quan bản Cát Cát",
        "Ngắm ruộng bậc thang"
      ],
      "inclusions": [
        "Xe đưa đón tận nơi",
        "Khách sạn 3 sao",
        "Bữa ăn theo chương trình"
      ],
      "exclusions": [
        "Vé cáp treo Fansipan (700k)",
        "Chi phí cá nhân"
      ]
    }
  },
  "itinerary": [
    {
      "dayNumber": 1,
      "translations": {
        "vi": {
          "title": "Hà Nội - Sapa",
          "description": "Xe đón tại điểm hẹn, khởi hành đi Sapa...",
          "meals": ["Trưa", "Tối"],
          "accommodation": "Khách sạn 3 sao tại Sapa"
        }
      }
    }
  ],
  "capacity": {
    "minGuests": 2,
    "maxGuests": 40,
    "privateAvailable": true
  },
  "pricing": {
    "basePrice": 2990000,
    "currency": "VND",
    "childPrice": 1990000,
    "singleSupplement": 500000
  },
  "difficulty": "MODERATE",
  "transportTypes": ["BUS"],
  "thumbnail": {
    "url": "https://cloudinary.com/...",
    "alt": "Tour Sapa 3 ngày 2 đêm"
  },
  "ratingSummary": {
    "average": 4.7,
    "total": 156
  },
  "bookingConfig": {
    "advanceBookingDays": 2,
    "allowInstantBooking": true,
    "requireDeposit": true,
    "depositPercent": 30
  },
  "isActive": true,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

---

## 🚀 PHẦN II: TƯƠNG LAI (ADVANCED)

### 1. Module mở rộng

#### 1.1 TourInventoryModule
**Mục đích:** Quản lý số chỗ còn trống theo từng ngày khởi hành

```typescript
@Schema({ collection: 'tour_inventories' })
export class TourInventory {
  @Prop({ type: Types.ObjectId, ref: Tour.name, required: true, index: true })
  tourId: Types.ObjectId;

  @Prop({ required: true, type: Date, index: true })
  departureDate: Date;

  @Prop({ required: true })
  totalSlots: number;

  @Prop({ default: 0 })
  bookedSlots: number;

  @Prop({ default: 0 })
  blockedSlots: number;

  @Prop({
    type: String,
    enum: ['AVAILABLE', 'LIMITED', 'FULL', 'CANCELLED'],
    default: 'AVAILABLE',
  })
  status: string;

  @Prop({ type: Number })
  specialPrice?: number; // Giá đặc biệt cho ngày này
}

// Methods
async checkAvailability(tourId, date, guestCount): Promise<boolean>
async blockSlots(tourId, date, count): Promise<void>
async releaseSlots(tourId, date, count): Promise<void>
async updateStatus(tourId, date): Promise<void>
```

**APIs:**
- `GET /api/v1/tours/:id/availability?month=2025-03` - Kiểm tra ngày còn chỗ
- `POST /api/v1/tour-inventory/block` - Block chỗ tạm (khi booking)
- `POST /api/v1/tour-inventory/release` - Release chỗ (khi hủy)

---

#### 1.2 TourBookingModule
**Mục đích:** Quản lý đặt tour

```typescript
@Schema({ collection: 'tour_bookings' })
export class TourBooking {
  @Prop({ required: true, unique: true })
  bookingCode: string; // TOUR-2025-001

  @Prop({ type: Types.ObjectId, ref: Tour.name, required: true, index: true })
  tourId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, type: Date, index: true })
  departureDate: Date;

  // Guest info
  @Prop({
    type: {
      adults: Number,
      children: Number,
      infants: Number,
    },
    required: true,
  })
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };

  @Prop({ type: [Object], required: true })
  guestDetails: Array<{
    type: 'ADULT' | 'CHILD' | 'INFANT';
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth?: Date;
    passportNumber?: string;
  }>;

  // Contact
  @Prop({ required: true })
  contactName: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop({ required: true })
  contactEmail: string;

  // Pricing
  @Prop({
    type: {
      basePrice: Number,
      childPrice: Number,
      infantPrice: Number,
      subtotal: Number,
      discount: Number,
      total: Number,
      deposit: Number,
      currency: String,
    },
    required: true,
  })
  pricing: any;

  @Prop({
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED', 'COMPLETED'],
    default: 'PENDING',
    index: true,
  })
  status: string;

  @Prop({ type: String, enum: ['PENDING', 'PARTIAL', 'FULL'], default: 'PENDING' })
  paymentStatus: string;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop()
  specialRequests?: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;
}

TourBookingSchema.index({ bookingCode: 1 }, { unique: true });
TourBookingSchema.index({ tourId: 1, departureDate: 1 });
TourBookingSchema.index({ userId: 1, status: 1 });
TourBookingSchema.index({ status: 1, createdAt: -1 });
```

**APIs:**
- `POST /api/v1/tour-bookings` - Tạo booking
- `GET /api/v1/tour-bookings/:code` - Lấy booking theo code
- `GET /api/v1/tour-bookings/my-bookings` - Lấy bookings của user
- `PATCH /api/v1/tour-bookings/:id/confirm` - Xác nhận booking
- `PATCH /api/v1/tour-bookings/:id/cancel` - Hủy booking
- `POST /api/v1/tour-bookings/:id/payment` - Thanh toán

---

#### 1.3 TourReviewModule
**Mục đích:** Đánh giá và review tour

```typescript
@Schema({ collection: 'tour_reviews' })
export class TourReview {
  @Prop({ type: Types.ObjectId, ref: Tour.name, required: true, index: true })
  tourId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: TourBooking.name, required: true })
  bookingId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({
    type: {
      tourGuide: Number,
      transportation: Number,
      accommodation: Number,
      meals: Number,
      value: Number,
    },
  })
  detailedRatings?: any;

  @Prop({ required: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ default: true })
  isVerified: boolean;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ type: Number, default: 0 })
  helpfulCount: number;
}

TourReviewSchema.index({ tourId: 1, isApproved: 1 });
TourReviewSchema.index({ userId: 1, tourId: 1 }, { unique: true });
```

**Post-hooks:** Update `ratingSummary` trong Tour khi có review mới

**APIs:**
- `POST /api/v1/tour-reviews` - Tạo review
- `GET /api/v1/tours/:id/reviews` - Lấy reviews của tour
- `PATCH /api/v1/tour-reviews/:id/helpful` - Đánh dấu hữu ích

---

#### 1.4 TourCategoryModule
**Mục đích:** Phân loại tour (Adventure, Beach, Cultural, ...)

```typescript
@Schema({ collection: 'tour_categories' })
export class TourCategory {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, required: true })
  translations: {
    [langCode: string]: {
      name: string;
      description?: string;
    };
  };

  @Prop({ type: { url: String, alt: String } })
  icon?: any;

  @Prop({ default: 0 })
  order: number;
}
```

**Cập nhật Tour Schema:**
```typescript
@Prop({
  type: [{ type: Types.ObjectId, ref: TourCategory.name }],
  default: [],
})
categories: Types.ObjectId[];
```

---

#### 1.5 TourGuideModule
**Mục đích:** Quản lý hướng dẫn viên

```typescript
@Schema({ collection: 'tour_guides' })
export class TourGuide {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop({ type: Object })
  translations: {
    [langCode: string]: {
      bio?: string;
      expertise?: string[];
    };
  };

  @Prop({ type: [String], default: [] })
  languages: string[]; // ["vi", "en", "fr"]

  @Prop({ type: [{ type: Types.ObjectId, ref: Province.name }], default: [] })
  specializedProvinces: Types.ObjectId[];

  @Prop({ type: { url: String, alt: String } })
  avatar?: any;

  @Prop({
    type: {
      average: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    default: {},
  })
  rating: any;

  @Prop({ default: true })
  isActive: boolean;
}
```

**Relation trong TourBooking:**
```typescript
@Prop({ type: Types.ObjectId, ref: TourGuide.name })
assignedGuideId?: Types.ObjectId;
```

---

### 2. Tính năng nâng cao

#### 2.1 Dynamic Pricing
- Giá thay đổi theo mùa (cao điểm, thấp điểm)
- Early bird discount
- Last minute deals
- Group discount

```typescript
@Schema({ collection: 'tour_pricing_rules' })
export class TourPricingRule {
  @Prop({ type: Types.ObjectId, ref: Tour.name, required: true })
  tourId: Types.ObjectId;

  @Prop({ required: true })
  ruleType: string; // SEASONAL, EARLY_BIRD, LAST_MINUTE, GROUP

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validTo?: Date;

  @Prop({ type: Object })
  conditions: any; // { daysBeforeDeparture: 30, minGuests: 10, ... }

  @Prop({ type: Object, required: true })
  adjustment: {
    type: 'PERCENT' | 'FIXED';
    value: number;
  };
}
```

#### 2.2 Tour Packages (Combo)
- Kết hợp nhiều tours
- Combo tour + hotel
- Multi-destination packages

```typescript
@Schema({ collection: 'tour_packages' })
export class TourPackage {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: Object })
  translations: any;

  @Prop({
    type: [
      {
        tourId: { type: Types.ObjectId, ref: Tour.name },
        order: Number,
        dayOffset: Number, // Ngày bắt đầu tương đối
      },
    ],
  })
  tours: any[];

  @Prop({
    type: {
      totalPrice: Number,
      discountedPrice: Number,
      savings: Number,
      currency: String,
    },
  })
  pricing: any;
}
```

#### 2.3 Waitlist System
- Cho phép khách đăng ký chờ khi tour full

```typescript
@Schema({ collection: 'tour_waitlists' })
export class TourWaitlist {
  @Prop({ type: Types.ObjectId, ref: Tour.name, required: true, index: true })
  tourId: Types.ObjectId;

  @Prop({ required: true, type: Date, index: true })
  departureDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  guestCount: number;

  @Prop({
    type: String,
    enum: ['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED'],
    default: 'WAITING',
  })
  status: string;

  @Prop({ type: Date })
  notifiedAt?: Date;
}
```

#### 2.4 Tour Customization
- Cho phép khách customize tour (thêm/bớt ngày, dịch vụ)

#### 2.5 Real-time Notifications
- Socket.IO cho booking updates
- Email/SMS confirmations
- Push notifications

#### 2.6 Analytics & Reporting
- Tour performance metrics
- Booking trends
- Revenue reports
- Popular destinations

---

### 3. Integration points

#### 3.1 Payment Gateway
- Stripe / VNPay / Momo
- Handle deposits & full payments
- Refunds

#### 3.2 Email Service
- Booking confirmations
- Reminders (7 days before departure)
- Post-tour review requests

#### 3.3 SMS Gateway
- Booking confirmations
- Last-minute updates

#### 3.4 Maps Integration
- Google Maps cho locations
- Route visualization

---

### 4. Admin Features

#### 4.1 Dashboard
- Booking statistics
- Revenue charts
- Upcoming departures
- Low inventory alerts

#### 4.2 Bulk Operations
- Import tours từ Excel/CSV
- Bulk price updates
- Bulk inventory management

#### 4.3 Automated Tasks
- Auto-send reminders
- Auto-cancel expired unpaid bookings
- Auto-update availability status

---

### 5. Performance Optimizations

#### 5.1 Caching
- Redis cache cho featured tours
- Cache tour details
- Cache availability calendar

#### 5.2 Search Optimization
- Elasticsearch cho full-text search
- Aggregations cho filters

#### 5.3 Image Optimization
- Lazy loading
- WebP format
- CDN delivery

---

### 6. Security Enhancements

- Rate limiting cho booking endpoints
- CAPTCHA cho public forms
- Payment security (PCI compliance)
- Data encryption for sensitive info

---

## 📊 Database Relationships Diagram

```
Province (1) ----< (N) Tour
                    |
                    | (1)
                    |
                    v (N)
              TourInventory
                    |
                    | (1)
                    |
                    v (N)
              TourBooking
                    |
                    ├─> (1) User
                    ├─> (1) Payment
                    ├─> (1) TourGuide
                    └─> (1) TourReview

Tour (N) ----< (N) TourCategory
Tour (N) ----< (N) Amenity
```

---

## 🎯 Priority Roadmap

### Phase 1: MVP (Week 1-2)
- ✅ Tour CRUD
- ✅ Basic filtering & search
- ✅ Province relationships

### Phase 2: Booking (Week 3-4)
- TourInventoryModule
- TourBookingModule
- Payment integration

### Phase 3: Reviews & Categories (Week 5-6)
- TourReviewModule
- TourCategoryModule
- Rating system

### Phase 4: Advanced Features (Week 7-8)
- TourGuideModule
- Dynamic pricing
- Tour packages

### Phase 5: Optimization (Week 9-10)
- Caching layer
- Search optimization
- Performance tuning

---

## 🧪 Testing Strategy

### Unit Tests
- Service methods
- DTO validations
- Business logic

### Integration Tests
- API endpoints
- Database operations
- Module interactions

### E2E Tests
- Complete booking flow
- Payment flow
- Cancellation flow

---

## 📚 Documentation

### API Documentation
- Swagger/OpenAPI specs
- Postman collection
- Example requests/responses

### Developer Guide
- Module architecture
- Data models
- Integration guide

---

**Lưu ý:** Plan này được thiết kế để scale và mở rộng dần theo nhu cầu thực tế. Nên implement MVP trước, test kỹ, sau đó mới thêm các tính năng nâng cao.
