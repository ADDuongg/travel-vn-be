import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { ApiRole } from 'src/api-role/schema/api-role.schema';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { RouterRole } from 'src/router-role/schema/router-role.schema';

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(RouterRole.name)
    private readonly routerRoleModel: Model<RouterRole>,

    @InjectModel(ApiRole.name)
    private readonly apiRoleModel: Model<ApiRole>,

    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async resolvePermissions(roleCodes: string[]) {
    if (!roleCodes || roleCodes.length === 0) {
      return { routers: [], apis: [] };
    }

    const roles = [...roleCodes].sort();
    const cacheKey = `permissions:${roles.join(',')}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as { routers: string[]; apis: string[] };
      }
    } catch {
      // best-effort cache
    }

    const [routerRoles, apiRoles] = await Promise.all([
      this.routerRoleModel.find({ roleCode: { $in: roles } }).lean(),

      this.apiRoleModel.find({ roleCode: { $in: roles } }).lean(),
    ]);

    const routers = Array.from(new Set(routerRoles.map((r) => r.routerCode)));

    const apis = Array.from(new Set(apiRoles.map((a) => a.apiCode)));

    const result = { routers, apis };
    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    } catch {
      // best-effort cache
    }
    return result;
  }
}
