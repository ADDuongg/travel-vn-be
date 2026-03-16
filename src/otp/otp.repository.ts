import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OtpPurpose, OtpRecord } from './otp.types';

@Injectable()
export class OtpRepository {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
    });
  }

  private getKey(purpose: OtpPurpose, target: string): string {
    return `otp:${purpose}:${target}`;
  }

  async save(record: OtpRecord, ttlSeconds: number): Promise<void> {
    const key = this.getKey(record.purpose, record.target);
    await this.client.set(key, JSON.stringify(record), 'EX', ttlSeconds);
  }

  async find(purpose: OtpPurpose, target: string): Promise<OtpRecord | null> {
    const key = this.getKey(purpose, target);
    const raw = await this.client.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as OtpRecord;
    } catch {
      return null;
    }
  }

  async delete(purpose: OtpPurpose, target: string): Promise<void> {
    const key = this.getKey(purpose, target);
    await this.client.del(key);
  }

  /**
   * Tăng số lần thử và trả về bản ghi mới nhất.
   */
  async incrementAttempts(
    purpose: OtpPurpose,
    target: string,
  ): Promise<OtpRecord | null> {
    const key = this.getKey(purpose, target);
    const raw = await this.client.get(key);
    if (!raw) return null;

    let parsed: OtpRecord;
    try {
      parsed = JSON.parse(raw) as OtpRecord;
    } catch {
      return null;
    }

    parsed.attempts += 1;

    const ttl = await this.client.ttl(key);
    if (ttl > 0) {
      await this.client.set(key, JSON.stringify(parsed), 'EX', ttl);
    } else {
      await this.client.set(key, JSON.stringify(parsed));
    }

    return parsed;
  }
}

