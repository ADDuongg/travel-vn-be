import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { Hotel, HotelDocument } from './schema/hotel.schema';
import { ProvincesService } from 'src/provinces/provinces.service';

@Injectable()
export class HotelService {
  constructor(
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,
    private readonly provincesService: ProvincesService,
  ) {}

  /**
   * Create a new hotel.
   * Validates provinceId exists before creating.
   */
  async create(dto: CreateHotelDto): Promise<Hotel> {
    const existed = await this.hotelModel.findOne({ slug: dto.slug });
    if (existed) {
      throw new ConflictException('Hotel slug already exists');
    }

    const provinces = await this.provincesService.findAll();
    const provinceExists = provinces.some(
      (p: { _id: unknown }) => String(p._id) === dto.provinceId,
    );
    if (!provinceExists) {
      throw new BadRequestException('Province not found');
    }

    return this.hotelModel.create({
      slug: dto.slug,
      isActive: dto.isActive ?? true,
      starRating: dto.starRating ?? 3,
      provinceId: new Types.ObjectId(dto.provinceId),
      translations: dto.translations,
      contact: dto.contact,
      location: dto.location,
      amenities: dto.amenities?.map((id) => new Types.ObjectId(id)) ?? [],
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
    return hotels.map((h) => String(h._id));
  }

  /**
   * Find all active hotels for dropdown/options.
   * Returns minimal fields: _id, slug, translations, provinceId
   */
  findAllActive(provinceId?: string) {
    const filter: Record<string, unknown> = { isActive: true };
    if (provinceId && Types.ObjectId.isValid(provinceId)) {
      filter.provinceId = new Types.ObjectId(provinceId);
    }
    return this.hotelModel
      .find(filter)
      .select('_id slug translations provinceId')
      .populate('provinceId', 'name code slug')
      .sort({ 'translations.vi.name': 1 })
      .lean();
  }

  /**
   * Find hotel by ID.
   */
  async findById(id: string): Promise<Hotel | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.hotelModel
      .findById(id)
      .populate('provinceId', 'name code slug fullName')
      .populate('amenities')
      .exec();
  }

  /**
   * Update hotel by ID.
   */
  async update(id: string, dto: UpdateHotelDto): Promise<Hotel> {
    const hotel = await this.hotelModel.findById(id);
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    if (dto.slug !== undefined && dto.slug !== hotel.slug) {
      const existed = await this.hotelModel.findOne({ slug: dto.slug });
      if (existed) {
        throw new ConflictException('Hotel slug already exists');
      }
      hotel.slug = dto.slug;
    }

    if (dto.provinceId !== undefined) {
      const provinces = await this.provincesService.findAll();
      const provinceExists = provinces.some(
        (p: { _id: unknown }) => String(p._id) === dto.provinceId,
      );
      if (!provinceExists) {
        throw new BadRequestException('Province not found');
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

    return hotel.save();
  }
}
