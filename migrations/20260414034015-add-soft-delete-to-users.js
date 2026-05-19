module.exports = {
  async up(db, client) {
    const users = db.collection('user');
    await users.createIndex({ deletedAt: 1 }, { sparse: true });
    await users.createIndex({ deletedBy: 1 }, { sparse: true });
  },

  async down(db, client) {
    const users = db.collection('user');
    await users.dropIndex('deletedAt_1');
    await users.dropIndex('deletedBy_1');
  },
};
