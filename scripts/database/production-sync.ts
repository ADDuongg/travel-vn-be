import { execSync } from 'child_process';
import * as path from 'path';
import mongoose from 'mongoose';
import { config, mongooseLocalConnectOptions, PATHS } from './lib/config';
import { log } from './lib/logger';
import { confirm } from './lib/confirm';
import { mongodump, mongorestore } from './lib/mongo-tools';
import { sanitizeDatabase } from './sanitize';

const SNAPSHOT_DIR = path.join(PATHS.backups, 'production-snapshot-seed');
const PULL_DUMP_DIR = path.join(PATHS.backups, 'production-debug');

type Mode = 'seed' | 'pull';

function parseMode(argv: string[]): Mode {
  const m = argv[2]?.toLowerCase();
  if (m === 'seed' || m === 'pull') {
    return m;
  }
  log.error(
    'Missing mode. Usage: ts-node scripts/database/production-sync.ts <seed|pull>',
  );
  log.info('  yarn db:seed:from-production');
  log.info('  yarn db:pull:production');
  process.exit(1);
}

function mongoUriWithDatabase(uri: string, databaseName: string): string {
  const u = new URL(uri);
  u.pathname = `/${databaseName.replace(/^\/+/, '')}`;
  return u.toString();
}

function requireProductionUri(): void {
  if (!config.mongoUriProduction) {
    log.error('MONGO_URI_PRODUCTION is not set in .env');
    log.info(
      'Set it to a read-only tunnel URI (same pattern as MONGO_URI_STAGING).',
    );
    process.exit(1);
  }
}

async function runSeed(): Promise<void> {
  log.header('SEED FROM PRODUCTION SNAPSHOT');

  requireProductionUri();

  log.warn(
    'You are about to copy production data to your machine. Use only with permission and a secure tunnel.',
  );
  log.info(
    `Production URI: ${config.mongoUriProduction.replace(/\/\/.*@/, '//***:***@')}`,
  );
  log.info(`Local DB target: ${config.dbLocal}`);

  const confirmed = await confirm(
    `Overwrite local "${config.dbLocal}" with SANITIZED production data?`,
  );
  if (!confirmed) {
    log.warn('Aborted by user.');
    process.exit(0);
  }

  log.step('Dumping from production (read-only)...');
  mongodump(config.mongoUriProduction, SNAPSHOT_DIR);

  log.step('Restoring dump to local database...');
  mongorestore(config.mongoUriLocal, SNAPSHOT_DIR, config.dbLocal, {
    drop: true,
  });

  const localAppUri = mongoUriWithDatabase(
    config.mongoUriLocal,
    config.dbLocal,
  );

  log.step('Connecting for sanitization...');
  await mongoose.connect(localAppUri, mongooseLocalConnectOptions);
  await sanitizeDatabase(mongoose.connection);

  log.step('Running migrations...');
  try {
    execSync('yarn run migrate-mongo up', {
      stdio: 'inherit',
      cwd: PATHS.projectRoot,
    });
    log.success('Migrations applied.');
  } catch {
    log.warn(
      'Migration step had issues (may be okay if no pending migrations).',
    );
  }

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
  log.success('Local database seeded from production (sanitized).');
}

async function runPull(): Promise<void> {
  log.header('PULL PRODUCTION DATA (DEBUG — RAW)');

  requireProductionUri();

  log.info(
    `Production URI: ${config.mongoUriProduction.replace(/\/\/.*@/, '//***:***@')}`,
  );
  log.info(`Debug DB target: ${config.dbProductionDebug}`);
  log.warn(
    'RAW production data: no sanitization. Legal/PII risk — local debugging only.',
  );

  const confirmed = await confirm(
    `Overwrite "${config.dbProductionDebug}" with raw production data?`,
  );
  if (!confirmed) {
    log.warn('Aborted by user.');
    process.exit(0);
  }

  log.step('Dumping from production (read-only)...');
  mongodump(config.mongoUriProduction, PULL_DUMP_DIR);

  const debugUri = mongoUriWithDatabase(
    config.mongoUriLocal,
    config.dbProductionDebug,
  );

  log.step(`Restoring to debug database "${config.dbProductionDebug}"...`);
  mongorestore(debugUri, PULL_DUMP_DIR, config.dbProductionDebug, {
    drop: true,
  });

  log.step('Running migrations against debug DB...');
  try {
    execSync('yarn run migrate-mongo up', {
      stdio: 'inherit',
      cwd: PATHS.projectRoot,
      env: {
        ...process.env,
        MONGO_URI_LOCAL: debugUri,
        MONGO_DB_LOCAL: config.dbProductionDebug,
      },
    });
    log.success('Migrations applied.');
  } catch {
    log.warn(
      'Migration step had issues (may be okay if no pending migrations).',
    );
  }

  log.step('Collecting summary...');
  await mongoose.connect(debugUri, mongooseLocalConnectOptions);
  const collections = await mongoose.connection.db!.listCollections().toArray();
  const counts: Record<string, string | number> = {};
  for (const col of collections) {
    const count = await mongoose.connection
      .db!.collection(col.name)
      .countDocuments();
    counts[col.name] = count;
  }
  await mongoose.disconnect();

  log.header('PULL COMPLETE — Debug DB Summary');
  log.table(counts);
  log.divider();
  log.success(`Raw production data restored to "${config.dbProductionDebug}".`);
  log.info(
    `Point a separate shell at this DB: MONGO_URI_LOCAL=<uri-with-db-${config.dbProductionDebug}> MONGO_DB_LOCAL=${config.dbProductionDebug}`,
  );
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv);
  if (mode === 'seed') {
    await runSeed();
  } else {
    await runPull();
  }
}

main().catch((err) => {
  log.error(err.message || String(err));
  process.exit(1);
});
