import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from 'src/config/env.validation';

@Injectable()
export class EnvService {
  constructor(private config: ConfigService<EnvConfig, true>) {}

  isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  isDevelopment(): boolean {
    return !this.isProduction();
  }

  get<K extends keyof EnvConfig>(
    key: K,
    defaultValue?: EnvConfig[K],
  ): EnvConfig[K] {
    return (
      this.config.get(key, { infer: true }) ?? (defaultValue as EnvConfig[K])
    );
  }
}
