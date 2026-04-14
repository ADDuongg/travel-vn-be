import { execSync } from 'child_process';
import * as fs from 'fs';
import { parseMongoUri } from './config';
import { log } from './logger';

function buildAuthArgs(parsed: ReturnType<typeof parseMongoUri>): string[] {
  const args: string[] = [];
  args.push('--host', `${parsed.host}:${parsed.port}`);
  if (parsed.username) {
    args.push('--username', parsed.username);
    args.push('--password', parsed.password);
    args.push('--authenticationDatabase', parsed.authSource);
    if (parsed.authMechanism) {
      args.push('--authenticationMechanism', parsed.authMechanism);
    }
  }
  return args;
}

export function mongodump(uri: string, outputDir: string): void {
  const parsed = parseMongoUri(uri);

  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const args = [
    'mongodump',
    ...buildAuthArgs(parsed),
    '--db',
    parsed.database,
    '--out',
    outputDir,
  ];

  log.info(
    `Dumping database "${parsed.database}" from ${parsed.host}:${parsed.port}`,
  );
  execSync(args.join(' '), { stdio: 'inherit' });
  log.success(`Dump saved to ${outputDir}`);
}

export function mongorestore(
  uri: string,
  inputDir: string,
  targetDb: string,
  options: { drop?: boolean } = {},
): void {
  const parsed = parseMongoUri(uri);
  const dumpDbDir = findDumpDbDir(inputDir);

  const args = [
    'mongorestore',
    ...buildAuthArgs(parsed),
    '--db',
    targetDb,
    ...(options.drop ? ['--drop'] : []),
    dumpDbDir,
  ];

  log.info(
    `Restoring to database "${targetDb}" on ${parsed.host}:${parsed.port}`,
  );
  execSync(args.join(' '), { stdio: 'inherit' });
  log.success(`Restored to "${targetDb}"`);
}

/**
 * mongodump creates: outputDir/<dbName>/
 * This finds the first subdirectory containing .bson files.
 */
function findDumpDbDir(outputDir: string): string {
  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  const subDir = entries.find((e) => e.isDirectory());
  if (!subDir) {
    throw new Error(`No database directory found in dump at: ${outputDir}`);
  }
  return `${outputDir}/${subDir.name}`;
}
