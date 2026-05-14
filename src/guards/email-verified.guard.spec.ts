import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainException } from 'src/common/exceptions';
import { EmailVerifiedGuard } from './email-verified.guard';

function makeContext(
  user:
    | {
        isEmailVerified?: boolean;
        roles?: string[];
        isSuperAdmin?: boolean;
      }
    | undefined,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('EmailVerifiedGuard', () => {
  let guard: EmailVerifiedGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new EmailVerifiedGuard(reflector);
  });

  it('allows when skip metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = makeContext({ isEmailVerified: false });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows when isEmailVerified is undefined (legacy)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows when isEmailVerified is true', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({ isEmailVerified: true });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws DomainException when isEmailVerified is false', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({ isEmailVerified: false });
    expect(() => guard.canActivate(ctx)).toThrow(DomainException);
  });

  it('allows admin role when isEmailVerified is false', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({
      isEmailVerified: false,
      roles: ['admin'],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows super_admin role when isEmailVerified is false', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({
      isEmailVerified: false,
      roles: ['super_admin'],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows isSuperAdmin when isEmailVerified is false', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({
      isEmailVerified: false,
      isSuperAdmin: true,
      roles: ['viewer'],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
