/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { CorrelationContextService } from '../correlation/correlation-context.service';

export interface JwtAuthenticatedUser {
  userId?: string | unknown;
  username?: unknown;
  role?: unknown;
  roles?: string[];
  isSuperAdmin?: boolean;
}

@Injectable()
export class AuthContextInterceptor implements NestInterceptor {
  constructor(private readonly correlationContext: CorrelationContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context
        .switchToHttp()
        .getRequest<Request & { user?: JwtAuthenticatedUser }>();
      const user = req.user;
      const userId = user?.userId;
      if (
        user &&
        userId != null &&
        typeof userId === 'string' &&
        userId.length > 0
      ) {
        const roleRaw = user.role;
        let userRole: string | undefined;
        if (
          typeof roleRaw === 'string' ||
          typeof roleRaw === 'number' ||
          typeof roleRaw === 'boolean'
        ) {
          userRole = String(roleRaw);
        }
        this.correlationContext.setSafeUserContext({
          userId: typeof userId === 'string' ? userId : undefined,
          username:
            typeof user.username === 'string' ? user.username : undefined,
          userRole,
          userRoles: Array.isArray(user.roles) ? [...user.roles] : undefined,
          ...(user.isSuperAdmin === true ? { isSuperAdmin: true } : {}),
        });
      }
    }
    return next.handle();
  }
}
