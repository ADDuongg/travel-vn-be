import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ResponseTransformInterceptor } from './http-success.interceptor.filter';
import { RESPONSE_MESSAGE_KEY_METADATA } from 'src/common/decorators/response-message-key.decorator';
import { COMMON_I18N_KEYS } from 'src/common/i18n/keys';
import { withI18nSuccess } from 'src/common/i18n/success-envelope';

describe('ResponseTransformInterceptor', () => {
  function createInterceptor(reflector: Reflector) {
    return new ResponseTransformInterceptor(reflector);
  }

  function mockContext(
    handler: object,
    reflector: Reflector,
    statusCode = 200,
  ): ExecutionContext {
    return {
      getHandler: () => handler,
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  }

  it('uses common.success and default message when no metadata or envelope', (done) => {
    const reflector = new Reflector();
    const interceptor = createInterceptor(reflector);
    const ctx = mockContext(() => {}, reflector);
    const next: CallHandler = { handle: () => of({ id: 1 }) };

    interceptor.intercept(ctx, next).subscribe((body: any) => {
      expect(body.messageKey).toBe(COMMON_I18N_KEYS.SUCCESS);
      expect(body.message).toBe('success');
      expect(body.data).toEqual({ id: 1 });
      done();
    });
  });

  it('uses @ResponseMessageKey metadata', (done) => {
    const reflector = new Reflector();
    const handler = () => {};
    jest
      .spyOn(reflector, 'get')
      .mockImplementation((key: string, tgt: unknown) => {
        if (key === RESPONSE_MESSAGE_KEY_METADATA && tgt === handler) {
          return 'auth.login.success';
        }
        return undefined;
      });
    const interceptor = createInterceptor(reflector);
    const ctx = mockContext(handler, reflector);
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(ctx, next).subscribe((body: any) => {
      expect(body.messageKey).toBe('auth.login.success');
      expect(body.message).toBe('success');
      done();
    });
  });

  it('unwraps withI18nSuccess envelope', (done) => {
    const reflector = new Reflector();
    const interceptor = createInterceptor(reflector);
    const ctx = mockContext(() => {}, reflector);
    const next: CallHandler = {
      handle: () =>
        of(withI18nSuccess({ a: 1 }, 'Custom message', 'booking.created')),
    };

    interceptor.intercept(ctx, next).subscribe((body: any) => {
      expect(body.messageKey).toBe('booking.created');
      expect(body.message).toBe('Custom message');
      expect(body.data).toEqual({ a: 1 });
      done();
    });
  });
});
