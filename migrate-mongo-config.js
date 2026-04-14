require('dotenv').config();

const uri = process.env.MONGO_URI_LOCAL;
if (!uri) {
  console.error('[migrate-mongo] Missing MONGO_URI_LOCAL in .env');
  process.exit(1);
}

const dbName = process.env.MONGO_DB_LOCAL || 'travel_vn_local';

const config = {
  mongodb: {
    url: uri,
    databaseName: dbName,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
