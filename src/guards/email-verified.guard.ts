import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainException } from 'src/common/exceptions';
import {
  bypassesEmailVerificationGate,
  isJwtEmailVerifiedEffective,
} from 'src/common/auth/email-verified.util';
import { AuthI18nKeys } from 'src/auth/auth.i18n-keys';
import { SKIP_EMAIL_VERIFIED_KEY } from './email-verified.decorator';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      user?: {
        isEmailVerified?: boolean;
        roles?: string[];
        isSuperAdmin?: boolean;
      };
    }>();
    const u = req.user;
    if (
      u &&
      bypassesEmailVerificationGate({
        roles: u.roles,
        isSuperAdmin: u.isSuperAdmin,
      })
    ) {
      return true;
    }
    const v = u?.isEmailVerified;
    if (isJwtEmailVerifiedEffective(v)) {
      return true;
    }

    throw new DomainException(
      'Email address must be verified',
      403,
      'EMAIL_NOT_VERIFIED',
      AuthI18nKeys.emailNotVerified,
    );
  }
}
