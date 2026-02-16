const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL = "info";

const normalizeLevel = (value) => {
  if (!value) return DEFAULT_LEVEL;
  const normalized = value.trim().toLowerCase();
  if (normalized === "warning") return "warn";
  if (LEVELS[normalized]) return normalized;
  return DEFAULT_LEVEL;
};

const resolveLevel = () =>
  normalizeLevel(
    process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL || DEFAULT_LEVEL,
  );

const shouldLog = (target, current) => LEVELS[target] >= LEVELS[current];

const createLogger = (scope) => {
  const currentLevel = resolveLevel();
  const prefix = `[${scope}]`;
  const build =
    (method, level) =>
    (...args) => {
      if (!shouldLog(level, currentLevel)) {
        return;
      }
      // eslint-disable-next-line no-console
      console[method](prefix, ...args);
    };

  return {
    debug: build("debug", "debug"),
    info: build("log", "info"),
    warn: build("warn", "warn"),
    error: build("error", "error"),
  };
};

module.exports = { createLogger };
