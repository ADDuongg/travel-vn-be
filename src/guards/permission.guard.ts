import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
import { Reflector } from '@nestjs/core';

import { RBAC_PERMISSIONS_METADATA_KEY } from 'src/rbac/constants';

function adminPathMatches(pathname: string): boolean {
  return pathname.includes('/admin/') || pathname.endsWith('/admin');
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const clazz = context.getClass();
    const required = this.reflector.getAllAndOverride<string[]>(
      RBAC_PERMISSIONS_METADATA_KEY,
      [handler, clazz],
    );

    const req = context.switchToHttp().getRequest<{
      originalUrl?: string;
      url?: string;
      user?: {
        rbacPermissions?: string[];
        permissions?: unknown;
        isSuperAdmin?: boolean;
      };
    }>();

    const raw = req.originalUrl ?? req.url ?? '';
    const pathname = typeof raw === 'string' ? raw.split('?')[0] : '';

    if (!adminPathMatches(pathname)) {
      return true;
    }

    if (!required || required.length === 0) {
      throw new ForbiddenDomainException('Missing required permissions metadata', 'FORBIDDEN', 'guards.forbidden');
    }

    const user = req.user;
    if (user?.isSuperAdmin) {
      return true;
    }

    const flat: string[] = Array.isArray(user?.rbacPermissions)
      ? user.rbacPermissions
      : [];

    const ok = required.every((p) => flat.includes(p));
    if (!ok) {
      throw new ForbiddenDomainException('Insufficient permissions', 'FORBIDDEN', 'guards.forbidden');
    }
    return true;
  }
}
