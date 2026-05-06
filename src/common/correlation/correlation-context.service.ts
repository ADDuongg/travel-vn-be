import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface CorrelationStore {
  requestId: string;
}

@Injectable()
export class CorrelationContextService {
  private readonly als = new AsyncLocalStorage<CorrelationStore>();

  run<T>(requestId: string, callback: () => T): T {
    return this.als.run({ requestId }, callback);
  }

  getRequestId(): string | undefined {
    return this.als.getStore()?.requestId;
  }
}
