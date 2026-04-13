import mongoose from 'mongoose';
import { hashSync } from 'bcryptjs';
import { log } from './lib/logger';
import { COLLECTIONS_TO_DROP } from './lib/config';

const DEMO_PASSWORD_HASH = hashSync('Demo@123', 10);

export async function sanitizeDatabase(db: mongoose.Connection): Promise<void> {
  log.step('Sanitizing User collection...');

  const usersCol = db.collection('user');
  const cursor = usersCol.find();
  let index = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;
    index++;

    const updates: Record<string, unknown> = {
      password: DEMO_PASSWORD_HASH,
      tokenVersion: 0,
    };

    if (doc.email) {
      updates.email = `user-${index}@demo.local`;
    }
    if (doc.phone) {
      updates.phone = `0900000${String(index).padStart(3, '0')}`;
    }

    await usersCol.updateOne({ _id: doc._id }, { $set: updates });
  }

  log.success(`Sanitized ${index} user(s). Passwords reset to "Demo@123".`);

  log.step('Dropping sensitive collections...');
  for (const colName of COLLECTIONS_TO_DROP) {
    const collections = await db
      .db!.listCollections({ name: colName })
      .toArray();
    if (collections.length > 0) {
      await db.collection(colName).drop();
      log.info(`Dropped: ${colName}`);
    } else {
      log.info(`Skipped (not found): ${colName}`);
    }
  }

  log.success('Sanitization complete.');
}

if (require.main === module) {
  (async () => {
    const { config } = await import('./lib/config');
    log.header('SANITIZE LOCAL DATABASE');

    await mongoose.connect(config.mongoUriLocal);
    await sanitizeDatabase(mongoose.connection);
    await mongoose.disconnect();

    log.success('Done.');
  })().catch((err) => {
    log.error(err.message || String(err));
    process.exit(1);
  });
}
