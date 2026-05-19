import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditLogService } from '../audit-log.service';
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
} from '../decorators/audit-log.decorator';
import {
  AuditCategory,
  AuditResourceType,
  CrudAuditAction,
} from '../enums/audit-log.enum';

const RESOURCE_MODEL_MAP: Record<AuditResourceType, string> = {
  [AuditResourceType.ROLE]: 'Role',
  [AuditResourceType.TOUR]: 'Tour',
  [AuditResourceType.USER]: 'User',
  [AuditResourceType.HOTEL]: 'Hotel',
  [AuditResourceType.ROOM]: 'Room',
  [AuditResourceType.BOOKING]: 'Booking',
  [AuditResourceType.TOUR_BOOKING]: 'TourBooking',
  [AuditResourceType.REVIEW]: 'Review',
  [AuditResourceType.TOUR_GUIDE]: 'TourGuide',
  [AuditResourceType.PAYMENT]: 'Payment',
  [AuditResourceType.AUTH_SESSION]: 'RefreshToken',
};

const HTTP_METHOD_TO_ACTION: Record<string, CrudAuditAction> = {
  POST: CrudAuditAction.RESOURCE_CREATED,
  PATCH: CrudAuditAction.RESOURCE_UPDATED,
  PUT: CrudAuditAction.RESOURCE_UPDATED,
  DELETE: CrudAuditAction.RESOURCE_DELETED,
};

@Injectable()
export class CrudAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const meta = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();
    const action = HTTP_METHOD_TO_ACTION[method];

    if (!action) return next.handle();

    const user = (req as any).user;
    const resourceId = req.params?.id;
    const modelName = meta.modelName ?? RESOURCE_MODEL_MAP[meta.resourceType];

    let oldValue: Record<string, any> | null = null;

    if (
      resourceId &&
      modelName &&
      (action === CrudAuditAction.RESOURCE_UPDATED ||
        action === CrudAuditAction.RESOURCE_DELETED)
    ) {
      try {
        const model = this.connection.model(modelName);
        const doc = await model.findById(resourceId).lean().exec();
        oldValue = doc as Record<string, any> | null;
      } catch {
        void 0;
      }
    }

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const resolvedAction = this.resolveAction(
            action,
            method,
            req.path,
            oldValue,
          );

          let newValue: Record<string, any> | null = null;

          if (
            responseData &&
            typeof responseData === 'object' &&
            action !== CrudAuditAction.RESOURCE_DELETED
          ) {
            newValue =
              action === CrudAuditAction.RESOURCE_UPDATED && oldValue
                ? this.extractChanges(oldValue, responseData)
                : responseData;
          }

          this.auditLogService.log({
            category: AuditCategory.CRUD,
            action: resolvedAction,
            resourceType: meta.resourceType,
            resourceId,
            userId: user?.userId,
            username: user?.username,
            ip: req.ip || req.headers['x-forwarded-for']?.toString(),
            userAgent: req.headers['user-agent'],
            oldValue,
            newValue,
          });
        },
      }),
    );
  }

  private resolveAction(
    baseAction: CrudAuditAction,
    method: string,
    path: string,
    oldValue: Record<string, any> | null,
  ): CrudAuditAction {
    if (method === 'DELETE' && oldValue?.deletedAt === undefined) {
      return CrudAuditAction.RESOURCE_DELETED;
    }
    if (method === 'DELETE') {
      return CrudAuditAction.RESOURCE_SOFT_DELETED;
    }
    if (method === 'PATCH' && path.includes('/restore')) {
      return CrudAuditAction.RESOURCE_RESTORED;
    }
    return baseAction;
  }

  private extractChanges(
    oldDoc: Record<string, any>,
    newDoc: Record<string, any>,
  ): Record<string, any> {
    const changes: Record<string, any> = {};
    for (const key of Object.keys(newDoc)) {
      if (key === '_id' || key === '__v' || key === 'updatedAt') continue;
      const oldVal = JSON.stringify(oldDoc[key]);
      const newVal = JSON.stringify(newDoc[key]);
      if (oldVal !== newVal) {
        changes[key] = newDoc[key];
      }
    }
    return changes;
  }
}
