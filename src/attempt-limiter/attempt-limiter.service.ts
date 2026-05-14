import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import {
  AttemptLimiterOptions,
  AttemptLimiterStatus,
} from './attempt-limiter.types';

@Injectable()
export class AttemptLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  private encodeKeyPart(raw: string): string {
    return Buffer.from(raw, 'utf8').toString('base64url');
  }

  private prefix(opts: Pick<AttemptLimiterOptions, 'scope' | 'key'>): string {
    return `limiter:${opts.scope}:${this.encodeKeyPart(opts.key)}`;
  }

  private countKey(opts: Pick<AttemptLimiterOptions, 'scope' | 'key'>): string {
    return `${this.prefix(opts)}:count`;
  }

  private lockKey(opts: Pick<AttemptLimiterOptions, 'scope' | 'key'>): string {
    return `${this.prefix(opts)}:lock`;
  }

  private toStatus(
    locked: boolean,
    retryAfterSec: number,
    count: number,
    maxAttempts: number,
  ): AttemptLimiterStatus {
    const remainingAttempts = locked ? 0 : Math.max(0, maxAttempts - count);
    return {
      count,
      remainingAttempts,
      locked,
      retryAfterSec,
    };
  }

  async check(opts: AttemptLimiterOptions): Promise<AttemptLimiterStatus> {
    const lk = this.lockKey(opts);
    const ck = this.countKey(opts);

    const lockTtl = await this.client.ttl(lk);
    if (lockTtl > 0) {
      return this.toStatus(true, lockTtl, 0, opts.maxAttempts);
    }

    const raw = await this.client.get(ck);
    const count = raw ? Number.parseInt(raw, 10) || 0 : 0;

    return this.toStatus(false, 0, count, opts.maxAttempts);
  }

  /**
   * Records a failed attempt. If already locked, does not increment the counter.
   * When count reaches `maxAttempts`, sets a lock key with `lockoutSec` TTL.
   */
  async hit(opts: AttemptLimiterOptions): Promise<AttemptLimiterStatus> {
    const lk = this.lockKey(opts);
    const ck = this.countKey(opts);

    const lockTtl = await this.client.ttl(lk);
    if (lockTtl > 0) {
      return this.toStatus(true, lockTtl, 0, opts.maxAttempts);
    }

    const count = await this.client.incr(ck);
    if (count === 1) {
      await this.client.expire(ck, opts.windowSec);
    }

    if (count >= opts.maxAttempts) {
      await this.client.set(lk, '1', 'EX', opts.lockoutSec);
      const newLockTtl = await this.client.ttl(lk);
      return this.toStatus(
        true,
        newLockTtl > 0 ? newLockTtl : opts.lockoutSec,
        count,
        opts.maxAttempts,
      );
    }

    return this.toStatus(false, 0, count, opts.maxAttempts);
  }

  async reset(opts: AttemptLimiterOptions): Promise<void> {
    const lk = this.lockKey(opts);
    const ck = this.countKey(opts);
    await this.client.del(lk, ck);
  }
}
