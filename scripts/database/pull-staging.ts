import { execSync } from 'child_process';
import * as path from 'path';
import mongoose from 'mongoose';
import { config, mongooseLocalConnectOptions, PATHS } from './lib/config';
import { log } from './lib/logger';
import { confirm } from './lib/confirm';
import { mongodump, mongorestore } from './lib/mongo-tools';

const DUMP_DIR = path.join(PATHS.backups, 'staging-debug');

async function main() {
  log.header('PULL STAGING DATA (DEBUG MODE)');

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
  log.info(`Debug DB target: ${config.dbDebug}`);
  log.warn('This is RAW staging data (no sanitization). For debugging only.');

  const confirmed = await confirm(
    `This will overwrite "${config.dbDebug}" with raw staging data. Continue?`,
  );
  if (!confirmed) {
    log.warn('Aborted by user.');
    process.exit(0);
  }

  log.step('Dumping data from staging (read-only)...');
  mongodump(config.mongoUriStaging, DUMP_DIR);

  const debugUri = config.mongoUriLocal.replace(
    `/${config.dbLocal}`,
    `/${config.dbDebug}`,
  );

  log.step(`Restoring to debug database "${config.dbDebug}"...`);
  mongorestore(debugUri, DUMP_DIR, config.dbDebug, { drop: true });

  log.step('Running migrations against debug DB...');
  try {
    const migrationEnv = {
      ...process.env,
      MONGO_URI_LOCAL: debugUri,
      MONGO_DB_LOCAL: config.dbDebug,
    };
    execSync('yarn run migrate-mongo up', {
      stdio: 'inherit',
      cwd: PATHS.projectRoot,
      env: migrationEnv,
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
  log.success(`Raw staging data restored to "${config.dbDebug}".`);
  log.info(
    `Connect with: DB_URI=<your-local-uri>/${config.dbDebug}?authSource=admin`,
  );
}

main().catch((err) => {
  log.error(err.message || String(err));
  process.exit(1);
});
