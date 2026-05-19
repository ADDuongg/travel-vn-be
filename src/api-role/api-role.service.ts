import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiRole } from './schema/api-role.schema';

@Injectable()
export class ApiRoleService {
  constructor(
    @InjectModel(ApiRole.name)
    private readonly apiRoleModel: Model<ApiRole>,
  ) {}

  async create(roleCode: string, apiCode: string) {
    try {
      return await this.apiRoleModel.create({
        roleCode,
        apiCode,
      });
    } catch {
      throw new DomainException(
        'API already assigned to role',
        400,
        'BAD_REQUEST',
        'api.role.bad_request',
      );
    }
  }

  async findAll() {
    return this.apiRoleModel.find().lean();
  }

  async findByRole(roleCode: string) {
    return this.apiRoleModel.find({ roleCode }).lean();
  }

  async remove(roleCode: string, apiCode: string) {
    return this.apiRoleModel.findOneAndDelete({
      roleCode,
      apiCode,
    });
  }

  async replaceByRole(roleCode: string, apiCodes: string[]) {
    await this.apiRoleModel.deleteMany({ roleCode });

    if (apiCodes.length === 0) return [];

    return this.apiRoleModel.insertMany(
      apiCodes.map((apiCode) => ({
        roleCode,
        apiCode,
      })),
    );
  }
}
