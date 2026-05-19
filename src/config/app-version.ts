import { readFileSync } from 'fs';
import { join } from 'path';

let cachedFromPackage: string | undefined;

function readVersionFromPackageJson(): string {
  if (cachedFromPackage !== undefined) return cachedFromPackage;
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as { version?: unknown };
    const v = typeof pkg.version === 'string' ? pkg.version.trim() : '';
    cachedFromPackage = v || 'unknown';
  } catch {
    cachedFromPackage = 'unknown';
  }
  return cachedFromPackage;
}

export function resolveAppVersion(envAppVersion?: string): string {
  const fromEnv =
    (envAppVersion?.trim() || process.env.APP_VERSION?.trim()) ?? '';
  if (fromEnv) return fromEnv;
  return readVersionFromPackageJson();
}
