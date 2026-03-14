import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const ADMIN_ROLES = ['admin', 'ADMIN', 'super_admin'];

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const roles: string[] = Array.isArray(req.user?.roles)
      ? req.user.roles
      : req.user?.role
        ? [req.user.role]
        : [];

    const normalized = roles.map((r) => r.toLowerCase());
    const hasAdminRole = ADMIN_ROLES.some((r) =>
      normalized.includes(r.toLowerCase()),
    );

    if (!hasAdminRole) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
