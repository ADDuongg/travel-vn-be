import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiRole } from 'src/api-role/schema/api-role.schema';
import { RouterRole } from 'src/router-role/schema/router-role.schema';

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(RouterRole.name)
    private readonly routerRoleModel: Model<RouterRole>,

    @InjectModel(ApiRole.name)
    private readonly apiRoleModel: Model<ApiRole>,
  ) {}

  async resolvePermissions(roleCodes: string[]) {
    if (!roleCodes || roleCodes.length === 0) {
      return { routers: [], apis: [] };
    }

    const [routerRoles, apiRoles] = await Promise.all([
      this.routerRoleModel.find({ roleCode: { $in: roleCodes } }).lean(),

      this.apiRoleModel.find({ roleCode: { $in: roleCodes } }).lean(),
    ]);

    const routers = Array.from(new Set(routerRoles.map((r) => r.routerCode)));

    const apis = Array.from(new Set(apiRoles.map((a) => a.apiCode)));

    return { routers, apis };
  }
}
