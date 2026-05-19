import { execFileSync } from 'child_process';
import * as fs from 'fs';
import { parseMongoUri } from './config';
import { log } from './logger';

const TOOLS_INSTALL_HINT =
  'Install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools ' +
  '(extract/add the `bin` folder to PATH on Windows, then open a new terminal).';

let mongoToolsVerified = false;

function ensureMongoDatabaseTools(): void {
  if (mongoToolsVerified) {
    return;
  }
  try {
    execFileSync('mongodump', ['--version'], { stdio: 'pipe' });
    execFileSync('mongorestore', ['--version'], { stdio: 'pipe' });
    mongoToolsVerified = true;
  } catch {
    throw new Error(
      `[mongo-tools] mongodump/mongorestore not found on PATH. ${TOOLS_INSTALL_HINT}`,
    );
  }
}

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
  ensureMongoDatabaseTools();

  const parsed = parseMongoUri(uri);

  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const argv = [
    ...buildAuthArgs(parsed),
    '--db',
    parsed.database,
    '--out',
    outputDir,
  ];

  log.info(
    `Dumping database "${parsed.database}" from ${parsed.host}:${parsed.port}`,
  );
  execFileSync('mongodump', argv, { stdio: 'inherit' });
  log.success(`Dump saved to ${outputDir}`);
}

export function mongorestore(
  uri: string,
  inputDir: string,
  targetDb: string,
  options: { drop?: boolean } = {},
): void {
  ensureMongoDatabaseTools();

  const parsed = parseMongoUri(uri);
  const dumpDbDir = findDumpDbDir(inputDir);

  const argv = [
    ...buildAuthArgs(parsed),
    '--db',
    targetDb,
    ...(options.drop ? ['--drop'] : []),
    dumpDbDir,
  ];

  log.info(
    `Restoring to database "${targetDb}" on ${parsed.host}:${parsed.port}`,
  );
  execFileSync('mongorestore', argv, { stdio: 'inherit' });
  log.success(`Restored to "${targetDb}"`);
}

function findDumpDbDir(outputDir: string): string {
  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  const subDir = entries.find((e) => e.isDirectory());
  if (!subDir) {
    throw new Error(`No database directory found in dump at: ${outputDir}`);
  }
  return `${outputDir}/${subDir.name}`;
}
