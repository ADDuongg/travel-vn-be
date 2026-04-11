import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateApiPermissionDto } from './dto/create-api-permission.dto';
import { UpdateApiPermissionDto } from './dto/update-api-permission.dto';
import { ApiPermission } from './entities/api-permission.entity';

@Injectable()
export class ApiPermissionService {
  constructor(
    @InjectModel(ApiPermission.name)
    private readonly apiModel: Model<ApiPermission>,
  ) {}

  // CREATE
  async create(dto: CreateApiPermissionDto) {
    const existed = await this.apiModel.findOne({
      code: dto.code,
    });

    if (existed) {
      throw new BadRequestException('API permission code already exists');
    }

    const api = new this.apiModel(dto);
    return api.save();
  }

  // READ ALL
  async findAll() {
    return this.apiModel.find().sort({ createdAt: -1 }).lean();
  }

  // READ ONE
  async findOne(id: string) {
    const api = await this.apiModel.findById(id).lean();

    if (!api) {
      throw new NotFoundException('API permission not found');
    }

    return api;
  }

  // UPDATE
  async update(id: string, dto: UpdateApiPermissionDto) {
    const api = await this.apiModel.findByIdAndUpdate(id, dto, { new: true });

    if (!api) {
      throw new NotFoundException('API permission not found');
    }

    return api;
  }

  // DELETE
  async remove(id: string) {
    const api = await this.apiModel.findByIdAndDelete(id);

    if (!api) {
      throw new NotFoundException('API permission not found');
    }

    return { deleted: true };
  }
}
