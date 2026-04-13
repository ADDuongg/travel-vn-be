import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  mongoUriLocal: requireEnv('MONGO_URI_LOCAL'),
  mongoUriStaging: process.env.MONGO_URI_STAGING || '',
  dbLocal: requireEnv('MONGO_DB_LOCAL'),
  dbDebug: process.env.MONGO_DB_DEBUG || 'travel_vn_debug',
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
