import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvService {
  constructor(private config: ConfigService) {}

  isProduction(): boolean {
    return (
      (this.config.get<string>('NODE_ENV') || 'development') === 'production'
    );
  }

  isDevelopment(): boolean {
    return !this.isProduction();
  }

  get(key: string, defaultValue = ''): string {
    return this.config.get<string>(key) ?? defaultValue;
  }
}
