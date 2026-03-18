import { DynamicModule, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { EnvModule } from 'src/env/env.module';
import { EnvService } from 'src/env/env.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({})
export class RedisModule {
  static forRootAsync(options: { isGlobal?: boolean } = {}): DynamicModule {
    const isGlobal = options.isGlobal ?? true;

    const redisClientProvider = {
      provide: REDIS_CLIENT,
      inject: [EnvService],
      useFactory: (env: EnvService) => {
        const host = env.get('REDIS_HOST', 'localhost');
        const port = env.get('REDIS_PORT', 6379);
        const password = env.get('REDIS_PASSWORD') || undefined;

        return new Redis({ host, port, password });
      },
    };

    /**
     * Ensure singleton client is closed on shutdown.
     * Nest will call `onApplicationShutdown` for any provider that implements it.
     */
    const redisShutdownProvider = {
      provide: 'REDIS_SHUTDOWN',
      inject: [REDIS_CLIENT],
      useFactory: (client: Redis) => ({
        async onApplicationShutdown() {
          try {
            await client.quit();
          } catch {
            // best-effort shutdown
          }
        },
      }),
    };

    return {
      module: RedisModule,
      global: isGlobal,
      imports: [EnvModule],
      providers: [redisClientProvider, redisShutdownProvider],
      exports: [REDIS_CLIENT],
    };
  }
}
