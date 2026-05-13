import { HttpException, type CallHandler, type LoggerService } from '@nestjs/common';
import { type HttpAdapterHost } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { LoggingInterceptor, sanitizeLogData } from '@/common/interceptors/logging.interceptor';
import { createHttpExecutionContext } from '../helpers/execution-context';

type LoggerMock = {
  log: Mock;
  error: Mock;
  warn: Mock;
};

function createAdapterHost(): HttpAdapterHost {
  return {
    httpAdapter: {
      getRequestMethod: vi.fn().mockReturnValue('GET'),
      getRequestUrl: vi.fn().mockReturnValue('/health'),
    },
  } as unknown as HttpAdapterHost;
}

function createLoggerMock(): LoggerMock {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
}

async function interceptWithResponse(response: unknown): Promise<LoggerMock> {
  const logger = createLoggerMock();
  const interceptor = new LoggingInterceptor(createAdapterHost(), logger as LoggerService);
  const context = createHttpExecutionContext({
    request: {},
    response,
  });
  const next: CallHandler = {
    handle: () => of({ status: 'ok' }),
  };

  await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({
    status: 'ok',
  });

  return logger;
}

describe('LoggingInterceptor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs Express-style response status after passing through response', async () => {
    const logger = await interceptWithResponse({ statusCode: 200 });

    expect(logger.log).toHaveBeenCalledWith(
      'Incoming request',
      expect.any(Object),
      'LoggingInterceptor',
    );
    expect(logger.log).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        method: 'GET',
        url: '/health',
        statusCode: 200,
        responseTimeMs: expect.any(Number),
      }),
      'LoggingInterceptor',
    );
  });

  it('logs Fastify-style raw response status', async () => {
    const logger = await interceptWithResponse({ raw: { statusCode: 201 } });

    expect(logger.log).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        statusCode: 201,
      }),
      'LoggingInterceptor',
    );
  });

  it('logs undefined status when response shape has no numeric status', async () => {
    const logger = await interceptWithResponse({ raw: {} });

    expect(logger.log).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        statusCode: undefined,
      }),
      'LoggingInterceptor',
    );
  });

  it('logs undefined status when response is not an object', async () => {
    const logger = await interceptWithResponse(undefined);

    expect(logger.log).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        statusCode: undefined,
      }),
      'LoggingInterceptor',
    );
  });

  it('logs HttpException status on error path', async () => {
    const logger = createLoggerMock();
    const interceptor = new LoggingInterceptor(createAdapterHost(), logger as LoggerService);
    const context = createHttpExecutionContext({
      request: {},
      response: { statusCode: 200 },
    });
    const next: CallHandler = {
      handle: () => throwError(() => new HttpException('Bad gateway', 502)),
    };

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBeInstanceOf(
      HttpException,
    );

    expect(logger.log).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        statusCode: 502,
      }),
      'LoggingInterceptor',
    );
  });

  it('logs sanitized request query and body', async () => {
    const logger = createLoggerMock();
    const interceptor = new LoggingInterceptor(createAdapterHost(), logger as LoggerService);
    const context = createHttpExecutionContext({
      request: {
        query: {
          accessToken: 'query-token',
        },
        body: {
          login: 'john',
          password: 'secret',
          nested: {
            refreshToken: 'refresh-token',
          },
        },
      },
      response: { statusCode: 200 },
    });
    const next: CallHandler = {
      handle: () => of({ status: 'ok' }),
    };

    await lastValueFrom(interceptor.intercept(context, next));

    expect(logger.log).toHaveBeenCalledWith(
      'Incoming request',
      {
        method: 'GET',
        url: '/health',
        query: {
          accessToken: '[REDACTED]',
        },
        body: {
          login: 'john',
          password: '[REDACTED]',
          nested: {
            refreshToken: '[REDACTED]',
          },
        },
      },
      'LoggingInterceptor',
    );
  });

  it('sanitizes sensitive values in arrays', () => {
    expect(
      sanitizeLogData({
        credentials: [{ password: 'secret' }],
        authorization: 'Bearer token',
      }),
    ).toEqual({
      credentials: [{ password: '[REDACTED]' }],
      authorization: '[REDACTED]',
    });
  });
});
