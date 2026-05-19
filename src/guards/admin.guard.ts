import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';

import { UserService } from 'src/user/user.service';

function adminPathMatches(pathname: string): boolean {
  return pathname.includes('/admin/') || pathname.endsWith('/admin');
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly users: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      originalUrl?: string;
      url?: string;
      user?: { userId?: string; sub?: string };
    }>();

    const raw = req.originalUrl ?? req.url ?? '';
    const pathname = typeof raw === 'string' ? raw.split('?')[0] : '';

    if (!adminPathMatches(pathname)) {
      return true;
    }

    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) {
      throw new DomainException(
        'Invalid authentication',
        401,
        'UNAUTHORIZED',
        'guards.unauthorized',
      );
    }

    await this.users.assertAdminPortalAccess(String(userId));
    return true;
  }
}
