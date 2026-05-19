import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRouterRoleDto } from './dto/create-router-role.dto';
import { RouterRole } from './entities/router-role.entity';

@Injectable()
export class RouterRoleService {
  constructor(
    @InjectModel(RouterRole.name)
    private readonly routerRoleModel: Model<RouterRole>,
  ) {}

  async create(dto: CreateRouterRoleDto) {
    try {
      const rr = new this.routerRoleModel(dto);
      return await rr.save();
    } catch {
      throw new DomainException(
        'Router already assigned to role',
        400,
        'BAD_REQUEST',
        'router.role.bad_request',
      );
    }
  }

  async findAll() {
    return this.routerRoleModel.find().lean();
  }

  async findByRole(roleCode: string) {
    return this.routerRoleModel.find({ roleCode }).lean();
  }

  async remove(roleCode: string, routerCode: string) {
    return this.routerRoleModel.findOneAndDelete({
      roleCode,
      routerCode,
    });
  }

  async replaceByRole(roleCode: string, routerCodes: string[]) {
    await this.routerRoleModel.deleteMany({ roleCode });

    const docs = routerCodes.map((routerCode) => ({
      roleCode,
      routerCode,
    }));

    if (docs.length === 0) return [];

    return this.routerRoleModel.insertMany(docs);
  }
}
