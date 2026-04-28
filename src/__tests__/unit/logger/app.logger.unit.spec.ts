import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLogger } from '@/common/logger/app.logger';

type WritableStreamMock = NodeJS.WritableStream & {
  write: ReturnType<typeof vi.fn>;
};

function createWritableStreamMock(): WritableStreamMock {
  return {
    write: vi.fn(),
  } as unknown as WritableStreamMock;
}

function createTempLogFilePath(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-hub-logs-')), 'app.log');
}

function readLogFile(logFilePath: string): string {
  return fs.readFileSync(logFilePath, 'utf8');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppLogger', () => {
  it('filters logs below the configured level', () => {
    const stdout = createWritableStreamMock();
    const stderr = createWritableStreamMock();
    const logger = new AppLogger({
      level: 'warn',
      logFilePath: createTempLogFilePath(),
      stdout,
      stderr,
    });

    logger.log('hidden');
    logger.debug('also hidden');
    logger.warn('visible warning');
    logger.error('visible error');

    expect(stdout.write).toHaveBeenCalledTimes(1);
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('visible warning'));
    expect(stderr.write).toHaveBeenCalledTimes(1);
    expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining('visible error'));
  });

  it('falls back to log level when configured level is not supported', () => {
    const stdout = createWritableStreamMock();
    const logger = new AppLogger({
      level: 'invalid',
      logFilePath: createTempLogFilePath(),
      stdout,
      stderr: createWritableStreamMock(),
    });

    logger.debug('hidden debug');
    logger.log('visible log');

    expect(stdout.write).toHaveBeenCalledTimes(1);
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('visible log'));
  });

  it('formats development logs as human-readable text', () => {
    const stdout = createWritableStreamMock();
    const logger = new AppLogger({
      level: 'debug',
      nodeEnv: 'development',
      logFilePath: createTempLogFilePath(),
      stdout,
      stderr: createWritableStreamMock(),
    });

    logger.log('Server started', { port: 4000 }, 'Bootstrap');

    expect(stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/LOG \[Bootstrap\] Server started .*port: 4000/),
    );
  });

  it('formats production logs as JSON and preserves error fields', () => {
    const stderr = createWritableStreamMock();
    const logger = new AppLogger({
      level: 'error',
      nodeEnv: 'production',
      logFilePath: createTempLogFilePath(),
      stdout: createWritableStreamMock(),
      stderr,
    });
    const error = new Error('Database failed');

    logger.error(error, 'PrismaService');

    const writtenLine = String(stderr.write.mock.calls[0][0]).trim();
    const parsed = JSON.parse(writtenLine) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      level: 'error',
      context: 'PrismaService',
      message: {
        name: 'Error',
        message: 'Database failed',
      },
    });
    expect(parsed['trace']).toEqual(error.stack);
  });

  it('writes logs to the configured file', () => {
    const logFilePath = createTempLogFilePath();
    const logger = new AppLogger({
      logFilePath,
      stdout: createWritableStreamMock(),
      stderr: createWritableStreamMock(),
    });

    logger.log('File log entry');

    expect(readLogFile(logFilePath)).toContain('File log entry');
  });

  it('rotates the log file when it exceeds max size', () => {
    const logFilePath = createTempLogFilePath();
    const logDirectory = path.dirname(logFilePath);
    fs.writeFileSync(logFilePath, 'old log entry', 'utf8');
    const logger = new AppLogger({
      logFilePath,
      maxFileSizeKb: 0.001,
      stdout: createWritableStreamMock(),
      stderr: createWritableStreamMock(),
    });

    logger.log('New log entry');

    const logFiles = fs.readdirSync(logDirectory);
    expect(logFiles).toContain('app.log');
    expect(logFiles.some((file) => /^app-\d{4}-.*\.log$/.test(file))).toBe(true);
    expect(readLogFile(logFilePath)).toContain('New log entry');
  });
});
