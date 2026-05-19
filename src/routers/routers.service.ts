import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router } from './schemas/router.schema';

@Injectable()
export class RouterService {
  constructor(
    @InjectModel(Router.name)
    private readonly routerModel: Model<Router>,
  ) {}

  async create(dto: CreateRouterDto) {
    const existed = await this.routerModel.findOne({
      code: dto.code,
    });

    if (existed) {
      throw new DomainException(
        'Router code already exists',
        400,
        'BAD_REQUEST',
        'routers.bad_request',
      );
    }

    const router = new this.routerModel(dto);
    return router.save();
  }

  async findAll() {
    return this.routerModel.find().sort({ order: 1, createdAt: -1 }).lean();
  }

  async findOne(id: string) {
    const router = await this.routerModel.findById(id).lean();

    if (!router) {
      throw new NotFoundDomainException(
        'Router not found',
        'NOT_FOUND',
        'routers.not_found',
      );
    }

    return router;
  }

  async update(id: string, dto: UpdateRouterDto) {
    const router = await this.routerModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    if (!router) {
      throw new NotFoundDomainException(
        'Router not found',
        'NOT_FOUND',
        'routers.not_found',
      );
    }

    return router;
  }

  async remove(id: string) {
    const router = await this.routerModel.findByIdAndDelete(id);

    if (!router) {
      throw new NotFoundDomainException(
        'Router not found',
        'NOT_FOUND',
        'routers.not_found',
      );
    }

    return { deleted: true };
  }
}
