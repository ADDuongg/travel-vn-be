import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiRole } from './schema/api-role.schema';

@Injectable()
export class ApiRoleService {
  constructor(
    @InjectModel(ApiRole.name)
    private readonly apiRoleModel: Model<ApiRole>,
  ) {}

  // CREATE
  async create(roleCode: string, apiCode: string) {
    try {
      return await this.apiRoleModel.create({
        roleCode,
        apiCode,
      });
    } catch {
      throw new BadRequestException('API already assigned to role');
    }
  }

  // LIST ALL
  async findAll() {
    return this.apiRoleModel.find().lean();
  }

  // LIST BY ROLE
  async findByRole(roleCode: string) {
    return this.apiRoleModel.find({ roleCode }).lean();
  }

  // DELETE 1 mapping
  async remove(roleCode: string, apiCode: string) {
    return this.apiRoleModel.findOneAndDelete({
      roleCode,
      apiCode,
    });
  }

  /**
   * Replace all APIs of a role
   * Dùng cho UI checkbox
   */
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
