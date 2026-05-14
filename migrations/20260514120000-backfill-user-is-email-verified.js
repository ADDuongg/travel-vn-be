module.exports = {
  /**
   * Backfill `isEmailVerified` / `emailVerifiedAt` for legacy users and any row not explicitly `true`.
   * Rollback is intentionally a no-op (prior states are not reconstructable).
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   */
  async up(db, client) {
    const users = db.collection('user');

    const filter = {
      $or: [
        { isEmailVerified: { $exists: false } },
        { isEmailVerified: null },
        { isEmailVerified: false },
      ],
    };

    const pipeline = [
      {
        $set: {
          isEmailVerified: true,
          emailVerifiedAt: {
            $ifNull: [
              '$emailVerifiedAt',
              { $ifNull: ['$createdAt', '$$NOW'] },
            ],
          },
        },
      },
    ];

    const result = await users.updateMany(filter, pipeline);

    console.log(
      `[migration user isEmailVerified] matched=${result.matchedCount} modified=${result.modifiedCount}`,
    );
  },

  /**
   * Lossy: cannot distinguish "missing field" vs `false` after up. Intentional no-op.
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   */
  async down(db, client) {
    console.warn(
      '[migration user isEmailVerified] down skipped — rollback would be lossy (cannot restore missing vs false).',
    );
  },
};
