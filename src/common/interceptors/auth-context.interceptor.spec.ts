import { of } from 'rxjs';
import { AuthContextInterceptor } from './auth-context.interceptor';
import { CorrelationContextService } from '../correlation/correlation-context.service';

describe('AuthContextInterceptor', () => {
  it('does not mutate correlation store when user is absent', () => {
    const correlation = new CorrelationContextService();
    const interceptor = new AuthContextInterceptor(correlation);

    correlation.run('req-1', () => {
      const http = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      };
      void interceptor.intercept(http as any, { handle: () => of(undefined) });
      expect(correlation.getStore()).toEqual({ requestId: 'req-1' });
    });
  });

  it('sets safe user fields when JWT payload is attached to req.user', () => {
    const correlation = new CorrelationContextService();
    const interceptor = new AuthContextInterceptor(correlation);

    correlation.run('req-2', () => {
      const http = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: '507f1f77bcf86cd799439011',
              username: 'alice',
              role: 'guide',
              roles: ['guide', 'user'],
              isSuperAdmin: false,
            },
          }),
        }),
      };

      void interceptor.intercept(http as any, { handle: () => of(undefined) });

      expect(correlation.getStore()).toEqual({
        requestId: 'req-2',
        userId: '507f1f77bcf86cd799439011',
        username: 'alice',
        userRole: 'guide',
        userRoles: ['guide', 'user'],
      });
    });
  });

  it('sets isSuperAdmin only when true', () => {
    const correlation = new CorrelationContextService();
    const interceptor = new AuthContextInterceptor(correlation);

    correlation.run('req-sa', () => {
      const http = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: '507f1f77bcf86cd799439011',
              isSuperAdmin: true,
            },
          }),
        }),
      };

      void interceptor.intercept(http as any, { handle: () => of(undefined) });

      expect(correlation.getStore()).toEqual({
        requestId: 'req-sa',
        userId: '507f1f77bcf86cd799439011',
        isSuperAdmin: true,
      });
    });
  });

  it('does not persist rbacPermissions on the correlation store', () => {
    const correlation = new CorrelationContextService();
    const interceptor = new AuthContextInterceptor(correlation);

    correlation.run('req-3', () => {
      const http = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: '507f1f77bcf86cd799439011',
              rbacPermissions: ['admin:evil'],
            },
          }),
        }),
      };

      void interceptor.intercept(http as any, { handle: () => of(undefined) });
      expect(correlation.getStore()).toEqual({
        requestId: 'req-3',
        userId: '507f1f77bcf86cd799439011',
      });
    });
  });
});
