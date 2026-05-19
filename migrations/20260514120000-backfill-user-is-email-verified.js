module.exports = {
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
            $ifNull: ['$emailVerifiedAt', { $ifNull: ['$createdAt', '$$NOW'] }],
          },
        },
      },
    ];

    const result = await users.updateMany(filter, pipeline);

    console.log(
      `[migration user isEmailVerified] matched=${result.matchedCount} modified=${result.modifiedCount}`,
    );
  },

  async down(db, client) {
    console.warn(
      '[migration user isEmailVerified] down skipped — rollback would be lossy (cannot restore missing vs false).',
    );
  },
};
