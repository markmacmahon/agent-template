export type LogLevel = "debug" | "info" | "warn" | "error";

type ConsoleMethod = "debug" | "info" | "warn" | "error";

type LogArgs = [message?: unknown, ...optionalParams: unknown[]];

export type Logger = {
  debug: (...args: LogArgs) => void;
  info: (...args: LogArgs) => void;
  warn: (...args: LogArgs) => void;
  error: (...args: LogArgs) => void;
};

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = "info";

const parseLogLevel = (value?: string): LogLevel => {
  if (!value) return DEFAULT_LEVEL;
  const normalized = value.trim().toLowerCase();
  if (normalized === "debug" || normalized === "info") return normalized;
  if (normalized === "warn" || normalized === "warning") return "warn";
  if (normalized === "error") return "error";
  return DEFAULT_LEVEL;
};

const getConfiguredLevel = (): LogLevel =>
  parseLogLevel(process.env.NEXT_PUBLIC_LOG_LEVEL);

const shouldLog = (target: LogLevel, current: LogLevel): boolean =>
  LEVEL_ORDER[target] >= LEVEL_ORDER[current];

export const createLogger = (scope: string): Logger => {
  const currentLevel = getConfiguredLevel();
  const prefix = `[${scope}]`;

  const buildMethod =
    (method: ConsoleMethod, targetLevel: LogLevel) =>
    (...args: LogArgs) => {
      if (!shouldLog(targetLevel, currentLevel)) return;
      console[method](prefix, ...args);
    };

  return {
    debug: buildMethod("debug", "debug"),
    info: buildMethod("info", "info"),
    warn: buildMethod("warn", "warn"),
    error: buildMethod("error", "error"),
  };
};
