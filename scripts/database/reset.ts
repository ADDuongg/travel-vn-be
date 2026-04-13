import mongoose from 'mongoose';
import { config } from './lib/config';
import { log } from './lib/logger';
import { confirm } from './lib/confirm';

async function main() {
  log.header('DATABASE RESET');
  log.info(`Target database: ${config.dbLocal}`);

  const confirmed = await confirm(
    `This will DROP all collections in "${config.dbLocal}". Continue?`,
  );
  if (!confirmed) {
    log.warn('Aborted by user.');
    process.exit(0);
  }

  log.step('Connecting to local MongoDB...');
  await mongoose.connect(config.mongoUriLocal);
  log.success('Connected.');

  log.step('Dropping database...');
  await mongoose.connection.db!.dropDatabase();
  log.success(`Database "${config.dbLocal}" dropped.`);

  await mongoose.disconnect();
  log.divider();
  log.success('Reset complete.');
}

main().catch((err) => {
  log.error(err.message || String(err));
  process.exit(1);
});
