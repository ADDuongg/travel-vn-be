import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('export.json', 'utf8'));

const provinces = raw.map((p) => ({
  type: p.Type,
  code: p.Code,
  slug: p.CodeName.replace(/_/g, '-'),
  name: {
    vi: p.Name,
    en: p.NameEn,
  },
  fullName: {
    vi: p.FullName,
    en: p.FullNameEn,
  },
  wards: p.Wards.map((w) => ({
    type: w.Type,
    code: w.Code,
    slug: w.CodeName.replace(/_/g, '-'),
    name: {
      vi: w.Name,
      en: w.NameEn,
    },
  })),
}));

fs.writeFileSync(
  'provinces.mongo.json',
  JSON.stringify(provinces, null, 2),
);

console.log(`Done. Wrote ${provinces.length} provinces to provinces.mongo.json`);
