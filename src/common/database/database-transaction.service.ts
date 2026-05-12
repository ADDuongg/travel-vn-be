import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { TransactionOptions } from 'mongodb';
import { EnvConfig } from 'src/config/env.validation';

@Injectable()
export class DatabaseTransactionService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  /**
   * Runs `runner` inside a MongoDB transaction when `MONGO_TRANSACTIONS_ENABLED` is true
   * (default: true in production only). Otherwise runs sequentially without a session — required
   * for standalone `mongod` (no replica set).
   */
  async runInTransaction<T>(
    runner: (session: ClientSession | undefined) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const useTransactions = this.config.get('MONGO_TRANSACTIONS_ENABLED', {
      infer: true,
    });

    if (!useTransactions) {
      return runner(undefined);
    }

    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await runner(session);
      }, options);
      return result;
    } finally {
      await session.endSession();
    }
  }
}
