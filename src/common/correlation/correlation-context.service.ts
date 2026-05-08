import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/** Fields merged into every Pino log line while inside an HTTP request (ALS scope). */
export interface CorrelationStore {
  requestId: string;
  userId?: string;
  username?: string;
  /** JWT `role` claim when present. */
  userRole?: string;
  /** JWT `roles` array. */
  userRoles?: string[];
  isSuperAdmin?: boolean;
}

export type SafeUserLogContext = Omit<CorrelationStore, 'requestId'>;

@Injectable()
export class CorrelationContextService {
  private readonly als = new AsyncLocalStorage<CorrelationStore>();

  run<T>(requestId: string, callback: () => T): T {
    return this.als.run({ requestId }, callback);
  }

  /**
   * Returns the current ALS store if any (middleware-bound request scope).
   * Intended for Pino mixin and tests.
   */
  getStore(): CorrelationStore | undefined {
    return this.als.getStore();
  }

  getRequestId(): string | undefined {
    return this.als.getStore()?.requestId;
  }

  /**
   * Attach safe identity fields for logging (never tokens, rbac arrays, etc.).
   */
  setSafeUserContext(fields: SafeUserLogContext): void {
    const store = this.als.getStore();
    if (!store) return;
    if (fields.userId !== undefined) store.userId = fields.userId;
    if (fields.username !== undefined) store.username = fields.username;
    if (fields.userRole !== undefined) store.userRole = fields.userRole;
    if (fields.userRoles !== undefined) store.userRoles = fields.userRoles;
    if (fields.isSuperAdmin !== undefined)
      store.isSuperAdmin = fields.isSuperAdmin;
  }
}
