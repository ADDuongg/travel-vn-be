import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenDomainException } from 'src/common/exceptions';
import { RBAC_PERMISSIONS_METADATA_KEY } from 'src/rbac/constants';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionGuard(reflector);

  function ctx(opts: {
    path: string;
    user?: { rbacPermissions?: string[]; isSuperAdmin?: boolean };
    permissions?: string[];
  }) {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === RBAC_PERMISSIONS_METADATA_KEY) {
        return opts.permissions ?? [];
      }
      return undefined;
    });

    return {
      getHandler: () => jest.fn(),
      getClass: () =>
        function TestController() {} as unknown as new (...args: unknown[]) => object,
      switchToHttp: () => ({
        getRequest: () => ({
          originalUrl: opts.path,
          user: opts.user,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows non-admin paths without metadata checks', () => {
    expect(
      guard.canActivate(
        ctx({ path: '/api/v1/public/hotels', permissions: [], user: {} }),
      ),
    ).toBe(true);
  });

  it('denies admin path without required permissions metadata', () => {
    expect(() =>
      guard.canActivate(
        ctx({ path: '/api/v1/admin/hotels', permissions: [], user: {} }),
      ),
    ).toThrow(ForbiddenDomainException);
  });

  it('allows super admin bypass', () => {
    expect(
      guard.canActivate(
        ctx({
          path: '/api/v1/admin/hotels',
          permissions: ['hotel.create'],
          user: { isSuperAdmin: true, rbacPermissions: [] },
        }),
      ),
    ).toBe(true);
  });

  it('allows when rbacPermissions satisfies every requirement', () => {
    expect(
      guard.canActivate(
        ctx({
          path: '/api/v1/admin/hotels',
          permissions: ['hotel.create'],
          user: {
            rbacPermissions: ['hotel.create', 'hotel.view'],
            isSuperAdmin: false,
          },
        }),
      ),
    ).toBe(true);
  });

  it('denies missing permission', () => {
    expect(() =>
      guard.canActivate(
        ctx({
          path: '/api/v1/admin/hotels',
          permissions: ['hotel.create'],
          user: { rbacPermissions: ['hotel.view'], isSuperAdmin: false },
        }),
      ),
    ).toThrow(ForbiddenDomainException);
  });
});
