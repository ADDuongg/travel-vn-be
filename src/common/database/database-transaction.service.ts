import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { TransactionOptions } from 'mongodb';

@Injectable()
export class DatabaseTransactionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async runInTransaction<T>(
    runner: (session: ClientSession) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
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
