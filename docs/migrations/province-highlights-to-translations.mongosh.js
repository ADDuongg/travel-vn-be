/**
 * One-time migration: province.highlights from legacy { name: { vi, en }, description?: { vi, en } }
 * to { translations: { vi: { name, description? }, en: { ... } }, thumbnail? }.
 *
 * Run: mongosh <connection-string> province-highlights-to-translations.mongosh.js
 * Or paste into mongosh after: use yourDatabase
 */

const cursor = db.provinces.find({
  highlights: { $exists: true, $ne: [] },
});

let updated = 0;
cursor.forEach((doc) => {
  const list = doc.highlights;
  if (!Array.isArray(list)) return;

  let changed = false;
  const next = list.map((h) => {
    if (h && h.translations && typeof h.translations === 'object') {
      return h;
    }
    if (!h || (!h.name && !h.description)) {
      return h;
    }

    const translations = {};
    const name = h.name || {};
    const description = h.description || {};
    const keys = new Set([
      ...Object.keys(name),
      ...Object.keys(description),
    ]);

    for (const k of keys) {
      const kk = String(k).toLowerCase();
      const block = {};
      if (name[k] != null && String(name[k]).trim() !== '') {
        block.name = String(name[k]).trim();
      }
      if (description[k] != null && String(description[k]).trim() !== '') {
        block.description = String(description[k]).trim();
      }
      if (block.name) {
        translations[kk] = block.description
          ? { name: block.name, description: block.description }
          : { name: block.name };
      }
    }

    if (!Object.keys(translations).length) {
      return h;
    }

    changed = true;
    const { name: _n, description: _d, ...rest } = h;
    return { ...rest, translations };
  });

  if (changed) {
    db.provinces.updateOne({ _id: doc._id }, { $set: { highlights: next } });
    updated++;
  }
});

print(`Updated ${updated} province documents with migrated highlights.`);
