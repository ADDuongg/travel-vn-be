const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

let stepCounter = 0;

export const log = {
  step(msg: string) {
    stepCounter++;
    console.log(
      `\n${COLORS.cyan}${COLORS.bold}[Step ${stepCounter}]${COLORS.reset} ${msg}`,
    );
  },

  info(msg: string) {
    console.log(`${COLORS.blue}[INFO]${COLORS.reset} ${msg}`);
  },

  success(msg: string) {
    console.log(`${COLORS.green}[OK]${COLORS.reset} ${msg}`);
  },

  warn(msg: string) {
    console.log(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`);
  },

  error(msg: string) {
    console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${msg}`);
  },

  divider() {
    console.log(`${COLORS.gray}${'─'.repeat(60)}${COLORS.reset}`);
  },

  header(title: string) {
    console.log('');
    log.divider();
    console.log(
      `${COLORS.bold}${COLORS.magenta}  ${title}${COLORS.reset}`,
    );
    log.divider();
  },

  table(rows: Record<string, string | number>) {
    const maxKey = Math.max(...Object.keys(rows).map((k) => k.length));
    for (const [key, value] of Object.entries(rows)) {
      console.log(
        `  ${COLORS.gray}${key.padEnd(maxKey)}${COLORS.reset}  ${value}`,
      );
    }
  },

  resetSteps() {
    stepCounter = 0;
  },
};
