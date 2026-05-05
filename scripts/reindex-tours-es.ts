/**
 * Bulk reindex all MongoDB tours into Elasticsearch (index from ELASTICSEARCH_TOURS_INDEX).
 * Requires ELASTICSEARCH_ENABLED=true, ELASTICSEARCH_URL, and DB_URI in .env (same as the API).
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { TourSearchService } from '../src/tour/tour-search.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const tourSearch = app.get(TourSearchService);
    if (!tourSearch.isUsable()) {
      console.error(
        '[reindex-tours-es] Elasticsearch is disabled or unreachable. Set ELASTICSEARCH_ENABLED=true, ELASTICSEARCH_URL, and ensure the cluster is up.',
      );
      process.exitCode = 1;
      return;
    }
    const { indexed } = await tourSearch.reindexAll();
    console.log(
      `[reindex-tours-es] Done. Indexed ${indexed} tour document(s).`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('[reindex-tours-es]', err);
  process.exit(1);
});
