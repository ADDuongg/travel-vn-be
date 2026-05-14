import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { AttemptLimiterService } from './attempt-limiter.service';

describe('AttemptLimiterService', () => {
  const opts = {
    scope: 'test-scope',
    key: 'user:127.0.0.1',
    maxAttempts: 3,
    windowSec: 60,
    lockoutSec: 120,
  } as const;

  const redis = {
    ttl: jest.fn(),
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  let service: AttemptLimiterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttemptLimiterService,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();
    service = module.get(AttemptLimiterService);
  });

  it('check returns locked when lock key TTL is positive', async () => {
    redis.ttl.mockResolvedValue(44);

    const st = await service.check(opts);

    expect(st.locked).toBe(true);
    expect(st.retryAfterSec).toBe(44);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('check returns count from counter when not locked', async () => {
    redis.ttl.mockResolvedValueOnce(-2);
    redis.get.mockResolvedValue('2');

    const st = await service.check(opts);

    expect(st.locked).toBe(false);
    expect(st.count).toBe(2);
    expect(st.remainingAttempts).toBe(1);
  });

  it('hit sets lock when counter reaches maxAttempts', async () => {
    redis.ttl.mockResolvedValueOnce(-2);
    redis.incr.mockResolvedValueOnce(3);
    redis.set.mockResolvedValue('OK');
    redis.ttl.mockResolvedValueOnce(118);

    const st = await service.hit(opts);

    expect(st.locked).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      expect.any(String),
      '1',
      'EX',
      opts.lockoutSec,
    );
    expect(st.retryAfterSec).toBe(118);
  });

  it('hit applies window TTL on first increment', async () => {
    redis.ttl.mockResolvedValueOnce(-2);
    redis.incr.mockResolvedValueOnce(1);

    await service.hit(opts);

    expect(redis.expire).toHaveBeenCalledWith(
      expect.any(String),
      opts.windowSec,
    );
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('reset deletes lock and counter keys', async () => {
    await service.reset(opts);

    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(redis.del.mock.calls[0]).toHaveLength(2);
  });
});
