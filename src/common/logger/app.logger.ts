import { type LoggerService } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { inspect } from 'node:util';
import { valuesOf } from '@/common/utils/values-of';

export const LogLevel = {
  Error: 'error',
  Warn: 'warn',
  Log: 'log',
  Debug: 'debug',
  Verbose: 'verbose',
} as const;

export type AppLogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const DEFAULT_LOG_LEVEL: AppLogLevel = LogLevel.Log;
const DEFAULT_MAX_FILE_SIZE_KB = 1024;
const LOG_LEVELS = valuesOf(LogLevel);
const LOG_LEVEL_PRIORITIES: Record<AppLogLevel, number> = {
  [LogLevel.Error]: 0,
  [LogLevel.Warn]: 1,
  [LogLevel.Log]: 2,
  [LogLevel.Debug]: 3,
  [LogLevel.Verbose]: 4,
};

export type AppLoggerOptions = {
  level?: string;
  nodeEnv?: string;
  logFilePath?: string;
  maxFileSizeKb?: number | string;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
};

type LogEntry = {
  timestamp: string;
  level: AppLogLevel;
  message: unknown;
  context?: string;
  trace?: string;
  params?: unknown[];
};

function isAppLogLevel(level: string): level is AppLogLevel {
  return LOG_LEVELS.includes(level as AppLogLevel);
}

function parseLogLevel(level: string | undefined): AppLogLevel {
  if (level && isAppLogLevel(level)) {
    return level;
  }

  return DEFAULT_LOG_LEVEL;
}

function resolveMaxFileSizeKb(value: number | string | undefined): number {
  const parsed = Number(value ?? DEFAULT_MAX_FILE_SIZE_KB);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_SIZE_KB;
}

function formatTimestampForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function toSerializable(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
}

function safeJsonStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(value, (_key, nestedValue: unknown) => {
    const serializableValue = toSerializable(nestedValue);

    if (serializableValue && typeof serializableValue === 'object') {
      if (seen.has(serializableValue)) return '[Circular]';
      seen.add(serializableValue);
    }

    return serializableValue;
  });
}

function inspectValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;

  return inspect(value, { colors: false, depth: 5, breakLength: Infinity });
}

export class AppLogger implements LoggerService {
  private readonly level: AppLogLevel;
  private readonly isProduction: boolean;
  private readonly logFilePath: string;
  private readonly maxFileSizeBytes: number;
  private readonly stdout: NodeJS.WritableStream;
  private readonly stderr: NodeJS.WritableStream;

  constructor(options: AppLoggerOptions = {}) {
    this.level = parseLogLevel(options.level ?? process.env.LOG_LEVEL);
    this.isProduction = (options.nodeEnv ?? process.env.NODE_ENV) === 'production';
    this.logFilePath = options.logFilePath ?? path.join(process.cwd(), 'logs', 'app.log');
    this.maxFileSizeBytes =
      resolveMaxFileSizeKb(options.maxFileSizeKb ?? process.env.LOG_MAX_FILE_SIZE) * 1024;
    this.stdout = options.stdout ?? process.stdout;
    this.stderr = options.stderr ?? process.stderr;
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('verbose', message, optionalParams);
  }

  private shouldLog(level: AppLogLevel): boolean {
    return LOG_LEVEL_PRIORITIES[level] <= LOG_LEVEL_PRIORITIES[this.level];
  }

  private write(level: AppLogLevel, message: unknown, optionalParams: unknown[]) {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, optionalParams);
    const line = this.formatEntry(entry);

    this.writeToConsole(level, line);
    try {
      this.writeToFile(line);
    } catch (error) {
      this.stderr.write(`Logger failed to write to file: ${inspectValue(error)}\n`);
    }
  }

  private createLogEntry(
    level: AppLogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): LogEntry {
    const params = [...optionalParams];
    const lastParam = params[params.length - 1];
    const context = typeof lastParam === 'string' ? (params.pop() as string) : undefined;
    const trace =
      level === 'error' && typeof params[0] === 'string' ? (params.shift() as string) : undefined;

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      trace: trace ?? (message instanceof Error ? message.stack : undefined),
      params: params.length > 0 ? params : undefined,
    };
  }

  private formatEntry(entry: LogEntry): string {
    if (this.isProduction) {
      return safeJsonStringify({
        ...entry,
        message: toSerializable(entry.message),
      });
    }

    const context = entry.context ? ` [${entry.context}]` : '';
    const params = entry.params?.length ? ` ${inspectValue(entry.params)}` : '';
    const trace = entry.trace ? `\n${entry.trace}` : '';

    return `${entry.timestamp} ${entry.level.toUpperCase()}${context} ${inspectValue(entry.message)}${params}${trace}`;
  }

  private writeToConsole(level: AppLogLevel, line: string) {
    const stream = level === 'error' ? this.stderr : this.stdout;
    stream.write(`${line}\n`);
  }

  private writeToFile(line: string) {
    this.ensureLogDirectory();
    this.rotateIfNeeded();
    fs.appendFileSync(this.logFilePath, `${line}\n`, 'utf8');
  }

  private ensureLogDirectory() {
    fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
  }

  private rotateIfNeeded() {
    if (!fs.existsSync(this.logFilePath)) return;

    const stats = fs.statSync(this.logFilePath);
    if (stats.size < this.maxFileSizeBytes) return;

    const extension = path.extname(this.logFilePath);
    const basename = path.basename(this.logFilePath, extension);
    const rotatedPath = path.join(
      path.dirname(this.logFilePath),
      `${basename}-${formatTimestampForFilename(new Date())}${extension}`,
    );

    fs.renameSync(this.logFilePath, rotatedPath);
  }
}
