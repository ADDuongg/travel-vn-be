import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  // CREATE
  async create(dto: CreateRouterDto) {
    const existed = await this.routerModel.findOne({
      code: dto.code,
    });

    if (existed) {
      throw new BadRequestException('Router code already exists');
    }

    const router = new this.routerModel(dto);
    return router.save();
  }

  // READ ALL
  async findAll() {
    return this.routerModel.find().sort({ order: 1, createdAt: -1 }).lean();
  }

  // READ ONE
  async findOne(id: string) {
    const router = await this.routerModel.findById(id).lean();

    if (!router) {
      throw new NotFoundException('Router not found');
    }

    return router;
  }

  // UPDATE
  async update(id: string, dto: UpdateRouterDto) {
    const router = await this.routerModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    if (!router) {
      throw new NotFoundException('Router not found');
    }

    return router;
  }

  // DELETE
  async remove(id: string) {
    const router = await this.routerModel.findByIdAndDelete(id);

    if (!router) {
      throw new NotFoundException('Router not found');
    }

    return { deleted: true };
  }
}
