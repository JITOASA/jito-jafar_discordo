/**
 * Logger Utility for جعفر Bot
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function timestamp() {
  return new Date().toLocaleTimeString('ar-SA', { hour12: false });
}

export const logger = {
  info: (msg, ...args) => {
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.cyan}ℹ [جعفر]${colors.reset} ${msg}`, ...args);
  },
  success: (msg, ...args) => {
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.green}✔ [نجاح]${colors.reset} ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.yellow}⚠ [تنبيه]${colors.reset} ${msg}`, ...args);
  },
  error: (msg, error) => {
    console.error(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.red}✖ [خطأ]${colors.reset} ${msg}`);
    if (error) {
      console.error(error);
    }
  },
  game: (gameName, msg) => {
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.magenta}🎮 [${gameName}]${colors.reset} ${msg}`);
  },
};

export default logger;
