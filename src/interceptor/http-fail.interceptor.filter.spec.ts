import { BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-fail.interceptor.filter';
import { REQUEST_ID_HEADER } from 'src/common/middleware/correlation-id.middleware';
import { AppException, NotFoundDomainException } from 'src/common/exceptions';

describe('HttpExceptionFilter (error contract)', () => {
  const filter = new HttpExceptionFilter();

  function mockHost(bodyJson: jest.Mock, req: Partial<Request>) {
    return {
      switchToHttp: () => ({
        getResponse: () => ({
          status: jest.fn().mockReturnValue({ json: bodyJson }),
        }),
        getRequest: () => req,
      }),
    };
  }

  it('maps NotFoundDomainException (AppException) with errorCode and safe shape', () => {
    const json = jest.fn();
    const url = '/api/v1/test';
    const host = mockHost(json, {
      method: 'GET',
      url,
      headers: { [REQUEST_ID_HEADER]: 'req-abc' },
    } as any);

    filter.catch(
      new NotFoundDomainException('Tour not found', 'TOUR_NOT_FOUND'),
      host as any,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        status: false,
        path: url,
        message: 'Tour not found',
        messageKey: 'common.not_found',
        errorCode: 'TOUR_NOT_FOUND',
        requestId: 'req-abc',
        data: null,
      }),
    );
  });

  it('maps HttpException validation-style errors', () => {
    const json = jest.fn();
    const host = mockHost(json, {
      method: 'POST',
      url: '/x',
      headers: {},
    } as any);

    filter.catch(new BadRequestException(['a', 'b']), host as any);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'a, b',
        messageKey: 'common.validation_failed',
        data: null,
      }),
    );
  });

  it('does not leak internal message for unknown errors (500)', () => {
    const json = jest.fn();
    const host = mockHost(json, {
      method: 'GET',
      url: '/x',
      headers: {},
    } as any);

    filter.catch(new Error('secret db failure'), host as any);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        messageKey: 'common.internal_error',
        data: null,
      }),
    );
  });

  it('maps Infrastructure-style AppException without leaking detail in body message', () => {
    const json = jest.fn();
    const host = mockHost(json, {
      method: 'GET',
      url: '/x',
      headers: {},
    } as any);

    class Infra extends AppException {
      constructor() {
        super('Internal server error', 500, 'INFRASTRUCTURE_ERROR');
      }
    }

    filter.catch(new Infra(), host as any);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        messageKey: 'common.internal_error',
        errorCode: 'INFRASTRUCTURE_ERROR',
      }),
    );
  });
});
