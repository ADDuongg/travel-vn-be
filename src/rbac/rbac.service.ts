import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  DomainException,
  ForbiddenDomainException,
  NotFoundDomainException,
} from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { Model, Types } from 'mongoose';

import { REDIS_CLIENT } from 'src/redis/redis.module';
import { Role } from 'src/roles/schemas/role.schema';

import {
  RbacPermission,
  RbacPermissionDocument,
} from './schemas/rbac-permission.schema';
import {
  RbacRolePermission,
  RbacRolePermissionDocument,
} from './schemas/rbac-role-permission.schema';

const CACHE_TTL_SEC = 300;

export type RbacPermissionRow = Pick<
  RbacPermission,
  'key' | 'resource' | 'action' | 'description'
>;

export interface RolePermissionUpdateResult {
  roleId: string;
  roleCode: string;
  previousKeys: string[];
  newKeys: string[];
}

@Injectable()
export class RbacService {
  constructor(
    @InjectModel(RbacPermission.name)
    private readonly permModel: Model<RbacPermissionDocument>,
    @InjectModel(RbacRolePermission.name)
    private readonly rolePermModel: Model<RbacRolePermissionDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async listPermissions(): Promise<RbacPermissionRow[]> {
    const docs = await this.permModel
      .find()
      .select('key resource action description')
      .lean()
      .exec();
    return (docs as RbacPermissionRow[]).sort((a, b) =>
      a.key.localeCompare(b.key),
    );
  }

  async getPermissionKeysForRole(roleId: string): Promise<string[]> {
    const oid = this.parseRoleOid(roleId);
    const role = await this.roleModel.findById(oid).lean().exec();
    if (!role) {
      throw new NotFoundDomainException(
        `Role ${roleId} not found`,
        'ROLE_NOT_FOUND',
        'rbac.role_not_found',
      );
    }
    const code = String(role.code).toLowerCase();
    if (code === 'super_admin') {
      return [];
    }
    return this.loadKeysForRoleId(oid);
  }

  async setPermissionsForRole(
    roleId: string,
    permissionKeys: string[],
  ): Promise<RolePermissionUpdateResult> {
    const oid = this.parseRoleOid(roleId);
    const role = await this.roleModel.findById(oid).lean().exec();
    if (!role) {
      throw new NotFoundDomainException(
        `Role ${roleId} not found`,
        'ROLE_NOT_FOUND',
        'rbac.role_not_found',
      );
    }
    const roleCode = String(role.code).toLowerCase();
    if (roleCode === 'super_admin') {
      throw new ForbiddenDomainException(
        'Role super_admin does not use role_permissions; use User.isSuperAdmin',
        'SUPER_ADMIN_IMMUTABLE',
        'rbac.super_admin_immutable',
      );
    }

    const previousKeys = await this.loadKeysForRoleId(oid);

    const normalized = this.normalizeKeys(permissionKeys);
    if (normalized.length > 0) {
      const found = await this.permModel
        .find({ key: { $in: normalized } })
        .select('key')
        .lean()
        .exec();
      const foundKeys = new Set(found.map((p) => p.key));
      const missing = normalized.filter((k) => !foundKeys.has(k));
      if (missing.length > 0) {
        throw new BadRequestException({
          message: 'Unknown permission keys',
          unknownKeys: missing,
        });
      }
    }

    await this.rolePermModel.deleteMany({ roleId: oid }).exec();

    if (normalized.length > 0) {
      const permDocs = await this.permModel
        .find({ key: { $in: normalized } })
        .select('_id')
        .lean()
        .exec();
      const uniquePermIds = [
        ...new Set(
          permDocs.map((p) => (p._id as Types.ObjectId).toHexString()),
        ),
      ];
      await this.rolePermModel.insertMany(
        uniquePermIds.map((pid) => ({
          roleId: oid,
          permissionId: new Types.ObjectId(pid),
        })),
      );
    }

    await this.invalidateAllFlatPermissionCaches();

    return {
      roleId: String(oid),
      roleCode,
      previousKeys,
      newKeys: normalized,
    };
  }

  private normalizeKeys(keys: string[]): string[] {
    const set = new Set<string>();
    for (const k of keys || []) {
      const t = String(k).trim();
      if (t) {
        set.add(t);
      }
    }
    return [...set].sort();
  }

  private parseRoleOid(roleId: string): Types.ObjectId {
    const id = String(roleId).trim();
    if (!Types.ObjectId.isValid(id)) {
      throw new DomainException(
        `Invalid role id: ${roleId}`,
        400,
        'INVALID_ROLE_ID',
        'rbac.bad_request',
      );
    }
    return new Types.ObjectId(id);
  }

  private async loadKeysForRoleId(roleId: Types.ObjectId): Promise<string[]> {
    const links = await this.rolePermModel
      .find({ roleId })
      .select('permissionId')
      .lean()
      .exec();
    const permIds = [...new Set(links.map((l) => String(l.permissionId)))];
    if (!permIds.length) {
      return [];
    }
    const perms = await this.permModel
      .find({
        _id: { $in: permIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('key')
      .lean()
      .exec();
    return [...new Set(perms.map((p) => p.key))].sort();
  }

  async resolveFlatPermissions(
    roleCodes: string[],
    isSuperAdmin: boolean,
  ): Promise<string[]> {
    if (isSuperAdmin) {
      return this.getAllPermissionKeysCached();
    }

    const roles = [...(roleCodes || [])]
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);
    if (roles.length === 0) {
      return [];
    }

    const sorted = [...roles].sort();
    const cacheKey = `rbac:flat:${sorted.join(',')}`;
    try {
      const hit = await this.redis.get(cacheKey);
      if (hit) {
        return JSON.parse(hit) as string[];
      }
    } catch {
      void 0;
    }

    const roleDocs = await this.roleModel
      .find({ code: { $in: sorted }, isActive: true })
      .select('_id code')
      .lean()
      .exec();

    if (!roleDocs.length) {
      return [];
    }

    const roleIds = roleDocs.map((r) => r._id as Types.ObjectId);
    const links = await this.rolePermModel
      .find({ roleId: { $in: roleIds } })
      .select('permissionId')
      .lean()
      .exec();

    const permIds = [...new Set(links.map((l) => String(l.permissionId)))];
    if (permIds.length === 0) {
      return [];
    }

    const perms = await this.permModel
      .find({ _id: { $in: permIds.map((id) => new Types.ObjectId(id)) } })
      .select('key')
      .lean()
      .exec();

    const keys = [...new Set(perms.map((p) => p.key))].sort();
    try {
      await this.redis.set(cacheKey, JSON.stringify(keys), 'EX', CACHE_TTL_SEC);
    } catch {
      void 0;
    }
    return keys;
  }

  private async getAllPermissionKeysCached(): Promise<string[]> {
    const cacheKey = 'rbac:flat:SUPERADMIN:ALL_KEYS';
    try {
      const hit = await this.redis.get(cacheKey);
      if (hit) {
        return JSON.parse(hit) as string[];
      }
    } catch {
      void 0;
    }

    const all = await this.permModel.find().select('key').lean().exec();
    const keys = [...new Set(all.map((p) => p.key))].sort();
    try {
      await this.redis.set(cacheKey, JSON.stringify(keys), 'EX', CACHE_TTL_SEC);
    } catch {
      void 0;
    }
    return keys;
  }

  async invalidateAllFlatPermissionCaches(): Promise<void> {
    try {
      const keys = await this.redis.keys('rbac:flat:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      void 0;
    }
  }

  async invalidateCachesForRoles(roleCodes: string[]): Promise<void> {
    const normalized = [...(roleCodes || [])]
      .map((r) => r.toLowerCase())
      .sort();
    const keys = [
      `rbac:flat:${normalized.join(',')}`,
      'rbac:flat:SUPERADMIN:ALL_KEYS',
    ];
    try {
      await this.redis.del(...keys);
    } catch {
      void 0;
    }
  }
}
