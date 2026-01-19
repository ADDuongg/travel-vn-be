import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { Hotel, HotelDocument } from './schema/hotel.schema';

@Injectable()
export class HotelService {
  constructor(
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<HotelDocument>,
  ) {}

  async create(createHotelDto: CreateHotelDto): Promise<Hotel> {
    const existed = await this.hotelModel.findOne({
      slug: createHotelDto.slug,
    });

    if (existed) {
      throw new ConflictException('Hotel slug already exists');
    }

    const hotel = new this.hotelModel({
      ...createHotelDto,
      isActive: createHotelDto.isActive ?? true,
    });

    return hotel.save();
  }
  async findAllActive() {
    return this.hotelModel
      .find({ isActive: true })
      .select('_id name')
      .sort({ name: 1 });
  }
  async findById(id: string): Promise<Hotel | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    return this.hotelModel.findById(id);
  }
}
