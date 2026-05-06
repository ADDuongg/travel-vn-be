import { CorrelationIdMiddleware, REQUEST_ID_HEADER } from './correlation-id.middleware';
import { CorrelationContextService } from '../correlation/correlation-context.service';

describe('CorrelationIdMiddleware', () => {
  it('sets request id and binds async local context', (done) => {
    const context = new CorrelationContextService();
    const middleware = new CorrelationIdMiddleware(context);

    const req = { headers: {} as Record<string, string> } as any;
    const res = { setHeader: jest.fn() } as any;

    middleware.use(req, res, () => {
      setTimeout(() => {
        expect(req.headers[REQUEST_ID_HEADER]).toBeDefined();
        expect(res.setHeader).toHaveBeenCalledWith(
          REQUEST_ID_HEADER,
          req.headers[REQUEST_ID_HEADER],
        );
        expect(context.getRequestId()).toBe(req.headers[REQUEST_ID_HEADER]);
        done();
      }, 0);
    });
  });
});
