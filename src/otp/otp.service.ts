import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorrelationContextService } from 'src/common/correlation/correlation-context.service';
import { createDomainEventEnvelope } from 'src/common/events/domain-event';
import { DomainException } from 'src/common/exceptions';
import { EnvService } from 'src/env/env.service';
import { NotificationEvent } from 'src/notification/notification.constants';
import { AttemptLimiterService } from 'src/attempt-limiter/attempt-limiter.service';
import type { AttemptLimiterOptions } from 'src/attempt-limiter/attempt-limiter.types';
import { OtpRepository } from './otp.repository';
import { OtpPurpose, OtpRecord } from './otp.types';

interface IssueOtpOptions {
  meta?: Record<string, unknown>;
}

@Injectable()
export class OtpService {
  private readonly ttlMinutes: number;
  private readonly maxAttempts: number;
  private readonly resendWindowSec: number;

  constructor(
    private readonly repo: OtpRepository,
    private readonly env: EnvService,
    private readonly eventEmitter: EventEmitter2,
    private readonly correlationContext: CorrelationContextService,
    private readonly attemptLimiter: AttemptLimiterService,
  ) {
    this.ttlMinutes = this.env.get('OTP_TTL_MINUTES', 5);
    this.maxAttempts = this.env.get('OTP_MAX_ATTEMPTS', 5);
    this.resendWindowSec = this.env.get('OTP_RESEND_WINDOW_SEC', 60);
  }

  private entryLimiterOpts(
    purpose: OtpPurpose,
    target: string,
  ): AttemptLimiterOptions {
    return {
      scope: 'otp-entry',
      key: `${purpose}:${target}`,
      maxAttempts: this.env.get('OTP_ENTRY_MAX_ATTEMPTS'),
      windowSec: this.env.get('OTP_ENTRY_WINDOW_SEC'),
      lockoutSec: this.env.get('OTP_ENTRY_LOCKOUT_SEC'),
    };
  }

  private generateCode(): string {
    const n = Math.floor(Math.random() * 1_000_000);
    return n.toString().padStart(6, '0');
  }

  async issue(
    purpose: OtpPurpose,
    target: string,
    options: IssueOtpOptions = {},
  ): Promise<OtpRecord> {
    if (!target?.trim()) {
      throw new DomainException(
        'Target is required for OTP',
        400,
        'BAD_REQUEST',
        'otp.bad_request',
      );
    }

    const existing = await this.repo.find(purpose, target);
    const now = new Date();

    if (existing) {
      const issuedAt = new Date(existing.issuedAt);
      const diffSec = (now.getTime() - issuedAt.getTime()) / 1000;
      if (diffSec < this.resendWindowSec) {
        throw new DomainException(
          'OTP recently sent, please wait before requesting again',
          429,
          'RATE_LIMIT',
          'otp.rate_limited',
        );
      }
    }

    const code = this.generateCode();
    const expiresAt = new Date(
      now.getTime() + this.ttlMinutes * 60 * 1000,
    ).toISOString();

    const record: OtpRecord = {
      purpose,
      target,
      code,
      issuedAt: now.toISOString(),
      expiresAt,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      meta: options.meta,
    };

    await this.repo.save(record, this.ttlMinutes * 60);

    this.eventEmitter.emit(
      String(NotificationEvent.OTP_ISSUED),
      createDomainEventEnvelope({
        eventName: String(NotificationEvent.OTP_ISSUED),
        source: OtpService.name,
        requestId: this.correlationContext.getRequestId(),
        payload: {
          purpose,
          target,
          code,
          meta: options.meta,
          expiresAt,
        },
      }),
    );

    return record;
  }

  async verifyAndConsume(
    purpose: OtpPurpose,
    target: string,
    code: string,
  ): Promise<OtpRecord> {
    const entryOpts = this.entryLimiterOpts(purpose, target);
    const entryStatus = await this.attemptLimiter.check(entryOpts);
    if (entryStatus.locked) {
      throw new DomainException(
        'Too many OTP verification attempts, try again later',
        429,
        'OTP_ENTRY_LOCKED',
        'otp.rate_limited',
      );
    }

    const record = await this.repo.find(purpose, target);

    if (!record) {
      throw new DomainException(
        'OTP not found or expired',
        400,
        'BAD_REQUEST',
        'otp.bad_request',
      );
    }

    const now = new Date();
    if (new Date(record.expiresAt) < now) {
      await this.repo.delete(purpose, target);
      throw new DomainException(
        'OTP has expired',
        400,
        'BAD_REQUEST',
        'otp.bad_request',
      );
    }

    if (record.attempts >= record.maxAttempts) {
      await this.repo.delete(purpose, target);
      await this.attemptLimiter.hit(entryOpts);
      throw new DomainException(
        'OTP attempts exceeded',
        429,
        'RATE_LIMIT',
        'otp.rate_limited',
      );
    }

    if (record.code !== code) {
      const updated = await this.repo.incrementAttempts(purpose, target);
      await this.attemptLimiter.hit(entryOpts);
      if (updated && updated.attempts >= updated.maxAttempts) {
        await this.repo.delete(purpose, target);
      }
      throw new DomainException(
        'Invalid OTP code',
        400,
        'BAD_REQUEST',
        'otp.bad_request',
      );
    }

    await this.repo.delete(purpose, target);
    await this.attemptLimiter.reset(entryOpts);
    return record;
  }
}
