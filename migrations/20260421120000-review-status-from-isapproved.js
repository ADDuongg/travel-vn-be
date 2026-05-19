module.exports = {
  async up(db, client) {
    const reviews = db.collection('reviews');

    const r1 = await reviews.updateMany(
      { status: { $exists: false }, isApproved: true },
      { $set: { status: 'APPROVED' }, $unset: { isApproved: '' } },
    );
    const r2 = await reviews.updateMany(
      { status: { $exists: false }, isApproved: false },
      { $set: { status: 'PENDING' }, $unset: { isApproved: '' } },
    );
    const r3 = await reviews.updateMany(
      { status: { $exists: false }, isApproved: { $exists: false } },
      { $set: { status: 'PENDING' } },
    );

    console.log(
      `[migration review-status] modified=${r1.modifiedCount + r2.modifiedCount + r3.modifiedCount} (approved=${r1.modifiedCount} pending_false=${r2.modifiedCount} pending_missing=${r3.modifiedCount})`,
    );
  },

  async down(db, client) {
    const reviews = db.collection('reviews');

    await reviews.updateMany(
      { status: 'APPROVED' },
      { $set: { isApproved: true }, $unset: { status: '' } },
    );
    await reviews.updateMany(
      { status: { $in: ['PENDING', 'REJECTED', 'HIDDEN'] } },
      { $set: { isApproved: false }, $unset: { status: '' } },
    );
  },
};
