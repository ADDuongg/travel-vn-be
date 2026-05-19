import { SetMetadata } from '@nestjs/common';
import { AuditResourceType } from '../enums/audit-log.enum';

export const AUDIT_LOG_KEY = 'AUDIT_LOG_METADATA';

export interface AuditLogMetadata {
  resourceType: AuditResourceType;
  modelName?: string;
}

export const AuditLog = (resourceType: AuditResourceType, modelName?: string) =>
  SetMetadata(AUDIT_LOG_KEY, { resourceType, modelName } as AuditLogMetadata);
