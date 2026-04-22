import { SetMetadata } from '@nestjs/common';
import { AuditResourceType } from '../enums/audit-log.enum';

export const AUDIT_LOG_KEY = 'AUDIT_LOG_METADATA';

export interface AuditLogMetadata {
  resourceType: AuditResourceType;
  modelName?: string;
}

/**
 * Marks a controller method for automatic CRUD audit logging.
 * The interceptor reads this metadata to determine resource type
 * and which Mongoose model to query for old/new values.
 *
 * @param resourceType - The resource type enum value
 * @param modelName - Optional Mongoose model name for old-value lookup (defaults to resourceType capitalized)
 */
export const AuditLog = (resourceType: AuditResourceType, modelName?: string) =>
  SetMetadata(AUDIT_LOG_KEY, { resourceType, modelName } as AuditLogMetadata);
