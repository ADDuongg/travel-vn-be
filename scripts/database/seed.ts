import { execSync } from 'child_process';
import * as fs from 'fs';
import mongoose from 'mongoose';
import { config, mongooseLocalConnectOptions, PATHS } from './lib/config';
import { log } from './lib/logger';
import { confirm } from './lib/confirm';
import { mongorestore } from './lib/mongo-tools';

function hasSeedData(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  const entries = fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
  return entries.length > 0;
}

async function main() {
  log.header('SEED LOCAL DATABASE');
  log.info(`Target database: ${config.dbLocal}`);

  const confirmed = await confirm(
    `This will RESET and RESEED "${config.dbLocal}". Continue?`,
  );
  if (!confirmed) {
    log.warn('Aborted by user.');
    process.exit(0);
  }

  log.step('Dropping local database...');
  await mongoose.connect(config.mongoUriLocal, mongooseLocalConnectOptions);
  await mongoose.connection.db!.dropDatabase();
  log.success(`Database "${config.dbLocal}" dropped.`);
  await mongoose.disconnect();

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

  const realisticDir = PATHS.seedsRealistic;
  const baseDir = PATHS.seedsBase;

  if (hasSeedData(realisticDir)) {
    log.step('Seeding from realistic data (staging snapshot)...');
    mongorestore(config.mongoUriLocal, realisticDir, config.dbLocal, {
      drop: false,
    });
  } else if (hasSeedData(baseDir)) {
    log.step('Seeding from base seed data...');
    mongorestore(config.mongoUriLocal, baseDir, config.dbLocal, {
      drop: false,
    });
  } else {
    log.warn('No seed data found in seeds/realistic/ or seeds/base/.');
    log.info(
      'Run "yarn db:seed:from-staging" first to generate realistic seeds,',
    );
    log.info('or add base seed data to seeds/base/.');
  }

  log.step('Collecting summary...');
  await mongoose.connect(config.mongoUriLocal, mongooseLocalConnectOptions);
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
  log.success('Local database seeded.');
}

main().catch((err) => {
  log.error(err.message || String(err));
  process.exit(1);
});
