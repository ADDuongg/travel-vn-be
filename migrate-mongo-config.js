const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ override: true });

function mongoUriLocalFromDisk() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return null;
  }
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  return parsed.MONGO_URI_LOCAL || null;
}

function rewriteMongoHostForHostMachine(uri) {
  if (!uri || fs.existsSync('/.dockerenv')) {
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

const uri = rewriteMongoHostForHostMachine(
  mongoUriLocalFromDisk() || process.env.MONGO_URI_LOCAL,
);
if (!uri) {
  console.error('[migrate-mongo] Missing MONGO_URI_LOCAL in .env');
  process.exit(1);
}

const dbName = process.env.MONGO_DB_LOCAL || 'travel_vn_local';

const runningInDocker = fs.existsSync('/.dockerenv');

const config = {
  mongodb: {
    url: uri,
    databaseName: dbName,
    options: runningInDocker
      ? {}
      : {
          directConnection: true,
        },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
