import { execSync } from 'child_process';
import * as path from 'path';
import mongoose from 'mongoose';
import { config, PATHS } from './lib/config';
import { log } from './lib/logger';
import { confirm } from './lib/confirm';
import { mongodump, mongorestore } from './lib/mongo-tools';
import { sanitizeDatabase } from './sanitize';

const SNAPSHOT_DIR = path.join(PATHS.backups, 'staging-snapshot');

async function main() {
  log.header('SEED FROM STAGING SNAPSHOT');

  if (!config.mongoUriStaging) {
    log.error('MONGO_URI_STAGING is not set in .env');
    log.info(
      'Set it and ensure SSH tunnel is open before running this command.',
    );
    process.exit(1);
  }

  log.info(
    `Staging URI: ${config.mongoUriStaging.replace(/\/\/.*@/, '//***:***@')}`,
  );
  log.info(`Local DB target: ${config.dbLocal}`);

  const confirmed = await confirm(
    `This will overwrite your local "${config.dbLocal}" database with sanitized staging data. Continue?`,
  );
  if (!confirmed) {
    log.warn('Aborted by user.');
    process.exit(0);
  }

  // Step 1: Dump from staging (read-only)
  log.step('Dumping data from staging (read-only)...');
  mongodump(config.mongoUriStaging, SNAPSHOT_DIR);

  // Step 2: Restore to local DB
  log.step('Restoring dump to local database...');
  mongorestore(config.mongoUriLocal, SNAPSHOT_DIR, config.dbLocal, {
    drop: true,
  });

  // Step 3: Sanitize
  log.step('Connecting to local DB for sanitization...');
  await mongoose.connect(config.mongoUriLocal);
  await sanitizeDatabase(mongoose.connection);

  // Step 4: Run migrations
  log.step('Running migrations...');
  try {
    execSync('npx migrate-mongo up', {
      stdio: 'inherit',
      cwd: PATHS.projectRoot,
    });
    log.success('Migrations applied.');
  } catch {
    log.warn(
      'Migration step had issues (may be okay if no pending migrations).',
    );
  }

  // Step 5: Print summary
  log.step('Collecting summary...');
  const collections = await mongoose.connection.db!.listCollections().toArray();
  const counts: Record<string, string | number> = {};
  for (const col of collections) {
    const count = await mongoose.connection
      .db!.collection(col.name)
      .countDocuments();
    counts[col.name] = count;
  }

  await mongoose.disconnect();

  log.header('SEED COMPLETE — Collection Summary');
  log.table(counts);
  log.divider();
  log.success('Local database seeded from staging snapshot (sanitized).');
}

main().catch((err) => {
  log.error(err.message || String(err));
  process.exit(1);
});
