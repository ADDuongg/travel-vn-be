import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { EnvService } from 'src/env/env.service';

@Injectable()
export class ElasticsearchConnectionService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchConnectionService.name);
  private client: Client | null = null;

  constructor(private readonly env: EnvService) {}

  isEnabled(): boolean {
    return this.env.get('ELASTICSEARCH_ENABLED');
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Elasticsearch client is not initialized');
    }
    return this.client;
  }

  getClientOrNull(): Client | null {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log(
        'Elasticsearch is disabled (ELASTICSEARCH_ENABLED=false)',
      );
      return;
    }

    const node = this.env.get('ELASTICSEARCH_URL')?.trim();
    if (!node) {
      this.logger.error(
        'ELASTICSEARCH_ENABLED is true but ELASTICSEARCH_URL is empty',
      );
      return;
    }

    const apiKey = this.env.get('ELASTICSEARCH_API_KEY')?.trim();

    const username = this.env.get('ELASTICSEARCH_USERNAME')?.trim();
    const password = this.env.get('ELASTICSEARCH_PASSWORD') ?? '';

    const auth = apiKey
      ? { apiKey }
      : username && username.length > 0
        ? { username, password: String(password) }
        : undefined;

    this.client = new Client({
      node,
      ...(auth ? { auth } : {}),
      tls: {
        rejectUnauthorized: false,
      },
      maxRetries: 3,
      requestTimeout: 60000,
    });

    try {
      await this.client.ping();
      this.logger.log(`Elasticsearch connected: ${node}`);
    } catch (err) {
      this.logger.error(
        `Elasticsearch ping failed — list/search will fall back to MongoDB`,
        err instanceof Error ? err.stack : String(err),
      );
      this.client = null;
    }
  }
}
