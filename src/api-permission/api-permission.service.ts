import { Injectable } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
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
      throw new DomainException('API permission code already exists', 400, 'BAD_REQUEST', 'api.permission.bad_request');
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
      throw new NotFoundDomainException('API permission not found', 'NOT_FOUND', 'api.permission.not_found');
    }

    return api;
  }

  // UPDATE
  async update(id: string, dto: UpdateApiPermissionDto) {
    const api = await this.apiModel.findByIdAndUpdate(id, dto, { new: true });

    if (!api) {
      throw new NotFoundDomainException('API permission not found', 'NOT_FOUND', 'api.permission.not_found');
    }

    return api;
  }

  // DELETE
  async remove(id: string) {
    const api = await this.apiModel.findByIdAndDelete(id);

    if (!api) {
      throw new NotFoundDomainException('API permission not found', 'NOT_FOUND', 'api.permission.not_found');
    }

    return { deleted: true };
  }
}
