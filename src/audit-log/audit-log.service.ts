/* eslint-disable @typescript-eslint/no-base-to-string */
import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  AuditCategory,
  AuditResourceType,
  AuditAction,
} from './enums/audit-log.enum';

const REDACTED_FIELDS = [
  'password',
  'tokenHash',
  'refreshToken',
  'refresh_token',
  '__v',
  'rawEvents',
];

export interface LogAuditParams {
  category: AuditCategory;
  action: AuditAction | string;
  resourceType?: AuditResourceType;
  resourceId?: unknown;
  userId?: unknown;
  username?: string;
  ip?: string;
  userAgent?: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  description?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(params: LogAuditParams): Promise<void> {
    try {
      const toObjectId = (val: unknown): Types.ObjectId | undefined => {
        if (!val) return undefined;
        const str = String(val);
        return Types.ObjectId.isValid(str)
          ? new Types.ObjectId(str)
          : undefined;
      };

      const data = {
        category: params.category,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: toObjectId(params.resourceId),
        userId: toObjectId(params.userId),
        username: params.username,
        ip: params.ip,
        userAgent: params.userAgent,
        oldValue: params.oldValue ? this.redact(params.oldValue) : undefined,
        newValue: params.newValue ? this.redact(params.newValue) : undefined,
        description: params.description,
        metadata: params.metadata,
      };

      await this.auditLogRepository.create(data);
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
    }
  }

  async findAll(query: AuditLogQueryDto) {
    return this.auditLogRepository.findAll(query);
  }

  async findById(id: string) {
    return this.auditLogRepository.findById(id);
  }

  async findAllForExport(query: AuditLogQueryDto) {
    return this.auditLogRepository.findAllForExport(query);
  }

  private redact(obj: Record<string, any>): Record<string, any> {
    const cleaned = { ...obj };
    for (const field of REDACTED_FIELDS) {
      if (field in cleaned) {
        delete cleaned[field];
      }
    }
    return cleaned;
  }
}
