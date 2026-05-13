import { Inject, Injectable } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { Model, Types } from 'mongoose';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { User } from 'src/user/schema/user.schema';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './schemas/role.schema';
import {
  RbacRolePermission,
  RbacRolePermissionDocument,
} from 'src/rbac/schemas/rbac-role-permission.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(RbacRolePermission.name)
    private readonly rolePermModel: Model<RbacRolePermissionDocument>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  // CREATE
  async create(createRoleDto: CreateRoleDto) {
    const existed = await this.roleModel.findOne({
      code: createRoleDto.code,
    });

    if (existed) {
      throw new DomainException('Role code already exists', 400, 'BAD_REQUEST', 'roles.bad_request');
    }

    const role = new this.roleModel(createRoleDto);
    return role.save();
  }

  // READ ALL
  async findAll() {
    return this.roleModel.find().sort({ createdAt: -1 }).lean();
  }

  // READ ONE (by id)
  async findOne(id: string) {
    const role = await this.roleModel.findById(id).lean();

    if (!role) {
      throw new NotFoundDomainException('Role not found', 'NOT_FOUND', 'roles.not_found');
    }

    return role;
  }

  // UPDATE
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleModel.findByIdAndUpdate(id, updateRoleDto, {
      new: true,
    });

    if (!role) {
      throw new NotFoundDomainException('Role not found', 'NOT_FOUND', 'roles.not_found');
    }

    return role;
  }

  // DELETE
  async remove(id: string) {
    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundDomainException('Role not found', 'NOT_FOUND', 'roles.not_found');
    }

    const assigned = await this.userModel.countDocuments({
      roles: role.code,
    });
    if (assigned > 0) {
      throw new DomainException(`Cannot delete role "${role.code}": ${assigned} user(s, 409, 'CONFLICT', 'roles.conflict') still reference this role.`,
      );
    }

    await this.rolePermModel
      .deleteMany({
        roleId: role._id as Types.ObjectId,
      })
      .exec();

    await role.deleteOne();
    await this.invalidateAllFlatPermissionCaches();

    return { deleted: true };
  }

  private async invalidateAllFlatPermissionCaches(): Promise<void> {
    try {
      const keys = await this.redis.keys('rbac:flat:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // ignore
    }
  }
}
