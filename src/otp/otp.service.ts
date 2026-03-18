import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvent } from 'src/notification/notification.constants';
import { EnvService } from 'src/env/env.service';
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
  ) {
    this.ttlMinutes = this.env.get('OTP_TTL_MINUTES', 5);
    this.maxAttempts = this.env.get('OTP_MAX_ATTEMPTS', 5);
    this.resendWindowSec = this.env.get('OTP_RESEND_WINDOW_SEC', 60);
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
      throw new BadRequestException('Target is required for OTP');
    }

    const existing = await this.repo.find(purpose, target);
    const now = new Date();

    if (existing) {
      const issuedAt = new Date(existing.issuedAt);
      const diffSec = (now.getTime() - issuedAt.getTime()) / 1000;
      if (diffSec < this.resendWindowSec) {
        throw new HttpException(
          'OTP recently sent, please wait before requesting again',
          429,
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

    // Bắn event để Notification module xử lý gửi email/SMS.
    this.eventEmitter.emit(String(NotificationEvent.OTP_ISSUED), {
      purpose,
      target,
      code,
      meta: options.meta,
      expiresAt,
    });

    return record;
  }

  async verifyAndConsume(
    purpose: OtpPurpose,
    target: string,
    code: string,
  ): Promise<OtpRecord> {
    const record = await this.repo.find(purpose, target);

    if (!record) {
      throw new BadRequestException('OTP not found or expired');
    }

    const now = new Date();
    if (new Date(record.expiresAt) < now) {
      await this.repo.delete(purpose, target);
      throw new BadRequestException('OTP has expired');
    }

    if (record.attempts >= record.maxAttempts) {
      await this.repo.delete(purpose, target);
      throw new HttpException('OTP attempts exceeded', 429);
    }

    if (record.code !== code) {
      const updated = await this.repo.incrementAttempts(purpose, target);
      if (updated && updated.attempts >= updated.maxAttempts) {
        await this.repo.delete(purpose, target);
      }
      throw new BadRequestException('Invalid OTP code');
    }

    await this.repo.delete(purpose, target);
    return record;
  }
}
