/**
 * Idempotent RBAC seed: collections `permissions`, `role_permissions`; upserts Role docs (`roles`).
 * Requires DB_URI — same Mongo as the NestJS app (.env).
 */
import mongoose from 'mongoose';

import {
  RBAC_PERMISSION_SEED,
  RBAC_ROLE_KEY_MATRIX,
} from '../../src/rbac/rbac-seed.data';
import { RBAC_ROLE_CODES } from '../../src/rbac/constants';
import { mongooseLocalConnectOptions, resolveAppMongoUri } from './lib/config';

/** Rebuild `role_permissions` from rbac-seed.data (overwrites custom admin assignments). */
const syncDefaultMatrix =
  process.argv.includes('--sync-default-matrix') ||
  process.env.RBAC_SEED_SYNC_MATRIX === 'true';

async function seed() {
  const uri = resolveAppMongoUri();

  await mongoose.connect(uri, mongooseLocalConnectOptions);
  console.log('[seed-rbac] connected');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('[seed-rbac] no db handle');
    process.exit(1);
  }

  const permColl = db.collection('permissions');

  // 1) Permissions
  for (const row of RBAC_PERMISSION_SEED) {
    await permColl.updateOne(
      { key: row.key },
      {
        $set: {
          resource: row.resource,
          action: row.action,
          key: row.key,
          description: row.description,
        },
      },
      { upsert: true },
    );
  }
  console.log(
    `[seed-rbac] permissions OK (${RBAC_PERMISSION_SEED.length} keys)`,
  );

  // 2) Role documents (reuse `roles` collection — align with RolesModule schema)
  const rolesColl = db.collection('roles');

  const roleMeta: Record<
    (typeof RBAC_ROLE_CODES)[number],
    { nameVi: string; desc: string }
  > = {
    super_admin: {
      nameVi: 'Super Administrator',
      desc: 'Toàn quyền (isSuperAdmin / bypass RBAC).',
    },
    admin: { nameVi: 'Administrator', desc: 'Quản trị nghiệp vụ chủ đạo.' },
    editor: { nameVi: 'Biên tập', desc: 'Nội dung & catalog.' },
    guide: { nameVi: 'Hướng dẫn viên', desc: 'Vận hành giới hạn.' },
    viewer: { nameVi: 'Xem chỉ đọc', desc: 'Chỉ xem báo cáo & dữ liệu.' },
  };

  for (const code of RBAC_ROLE_CODES) {
    const m = roleMeta[code];
    await rolesColl.updateOne(
      { code },
      {
        $set: {
          code,
          name: m.nameVi,
          description: m.desc,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }

  console.log('[seed-rbac] roles OK');

  if (!syncDefaultMatrix) {
    console.log(
      '[seed-rbac] skipping role_permissions junction (default / custom matrix preserved). Run with --sync-default-matrix or RBAC_SEED_SYNC_MATRIX=true to rebuild from rbac-seed.data.',
    );
    await mongoose.disconnect();
    console.log('[seed-rbac] done.');
    return;
  }

  // 3) Junction — skip super_admin (uses User.isSuperAdmin only)

  const permByKey = new Map<string, { _id: unknown }>();
  const allPerms = await permColl.find({}).toArray();
  for (const doc of allPerms) {
    permByKey.set(doc['key'] as string, doc);
  }

  const rpColl = db.collection('role_permissions');

  for (const rk of RBAC_ROLE_CODES) {
    if (rk === 'super_admin') {
      const r = await rolesColl.findOne(
        { code: rk },
        { projection: { _id: 1 } },
      );
      if (r?._id) {
        await rpColl.deleteMany({ roleId: r._id });
      }
      continue;
    }

    const keysForRole = RBAC_ROLE_KEY_MATRIX[rk];
    const roleDoc = await rolesColl.findOne({ code: rk });
    if (!roleDoc || !('_id' in roleDoc)) {
      console.warn(`[seed-rbac] missing Role document for ${rk}`);
      continue;
    }

    const roleOid = roleDoc._id as
      | mongoose.mongo.ObjectId
      | mongoose.Types.ObjectId;
    await rpColl.deleteMany({ roleId: roleOid });

    for (const key of keysForRole) {
      const pdoc = permByKey.get(key);
      if (!pdoc?._id) {
        console.warn(`[seed-rbac] unknown permission key: ${key}`);
        continue;
      }
      await rpColl.updateOne(
        { roleId: roleOid, permissionId: pdoc._id },
        {
          $setOnInsert: {
            roleId: roleOid,
            permissionId: pdoc._id,
          },
        },
        { upsert: true },
      );
    }
  }

  console.log('[seed-rbac] role_permissions OK');
  await mongoose.disconnect();
  console.log('[seed-rbac] done.');
}

seed().catch((e) => {
  console.error(e);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
