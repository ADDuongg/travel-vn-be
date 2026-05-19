import * as dotenv from 'dotenv';
import * as fs from 'fs';
import type { ConnectOptions } from 'mongoose';
import * as path from 'path';

const ENV_PATH = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: ENV_PATH, override: true });

function runningInDocker(): boolean {
  return fs.existsSync('/.dockerenv');
}

function readDotenvFromDisk(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }
  return dotenv.parse(fs.readFileSync(ENV_PATH));
}

const disk = readDotenvFromDisk();

export function rewriteMongoHostForHostMachine(uri: string): string {
  if (!uri || runningInDocker()) {
    return uri;
  }
  try {
    const u = new URL(uri);
    if (u.hostname === 'mongo') {
      u.hostname = 'localhost';
      return u.toString();
    }
  } catch {
    return uri;
  }
  return uri;
}

function resolveMongoUriLocal(): string {
  const raw = disk.MONGO_URI_LOCAL || process.env.MONGO_URI_LOCAL;
  if (!raw) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Missing MONGO_URI_LOCAL in .env`);
    process.exit(1);
  }
  return rewriteMongoHostForHostMachine(raw);
}

export const mongooseLocalConnectOptions: ConnectOptions = runningInDocker()
  ? {}
  : { directConnection: true };

export function resolveAppMongoUri(): string {
  const raw =
    disk.DB_URI ||
    disk.MONGO_URI_LOCAL ||
    process.env.DB_URI ||
    process.env.MONGO_URI_LOCAL;
  if (!raw) {
    console.error(
      `\x1b[31m[ERROR]\x1b[0m Missing DB_URI or MONGO_URI_LOCAL in .env`,
    );
    process.exit(1);
  }
  return rewriteMongoHostForHostMachine(raw);
}

const dbLocal = disk.MONGO_DB_LOCAL || process.env.MONGO_DB_LOCAL;
if (!dbLocal) {
  console.error(`\x1b[31m[ERROR]\x1b[0m Missing MONGO_DB_LOCAL in .env`);
  process.exit(1);
}

const mongoUriProductionRaw =
  disk.MONGO_URI_PRODUCTION || process.env.MONGO_URI_PRODUCTION || '';
const mongoUriProduction = mongoUriProductionRaw
  ? rewriteMongoHostForHostMachine(mongoUriProductionRaw.trim())
  : '';

const dbProductionDebug =
  disk.MONGO_DB_PRODUCTION_DEBUG ||
  process.env.MONGO_DB_PRODUCTION_DEBUG ||
  'travel_vn_prod_debug';

export const config = {
  mongoUriLocal: resolveMongoUriLocal(),
  mongoUriStaging: process.env.MONGO_URI_STAGING || '',
  mongoUriProduction,
  dbLocal,
  dbDebug: process.env.MONGO_DB_DEBUG || 'travel_vn_debug',
  dbProductionDebug,
};

export function parseMongoUri(uri: string) {
  const url = new URL(uri);
  return {
    host: url.hostname,
    port: url.port || '27017',
    database: url.pathname.replace('/', ''),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    authSource: url.searchParams.get('authSource') || 'admin',
    authMechanism: url.searchParams.get('authMechanism') || '',
  };
}

export const PATHS = {
  backups: path.resolve(__dirname, '../../../backups'),
  seedsBase: path.resolve(__dirname, '../../../seeds/base'),
  seedsRealistic: path.resolve(__dirname, '../../../seeds/realistic'),
  migrations: path.resolve(__dirname, '../../../migrations'),
  projectRoot: path.resolve(__dirname, '../../..'),
};

export const COLLECTIONS_TO_DROP = [
  'refreshtokens',
  'idempotencies',
  'notifications',
];
