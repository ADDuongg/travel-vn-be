module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const users = db.collection('user');
    await users.createIndex({ deletedAt: 1 }, { sparse: true });
    await users.createIndex({ deletedBy: 1 }, { sparse: true });
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    const users = db.collection('user');
    await users.dropIndex('deletedAt_1');
    await users.dropIndex('deletedBy_1');
  }
};
