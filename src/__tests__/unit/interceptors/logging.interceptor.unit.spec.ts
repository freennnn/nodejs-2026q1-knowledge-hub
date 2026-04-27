import { type CallHandler } from '@nestjs/common';
import { type HttpAdapterHost } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { createHttpExecutionContext } from '../helpers/execution-context';

type LoggerMock = {
  log: ReturnType<typeof vi.fn>;
};

function createAdapterHost(): HttpAdapterHost {
  return {
    httpAdapter: {
      getRequestMethod: vi.fn().mockReturnValue('GET'),
      getRequestUrl: vi.fn().mockReturnValue('/health'),
    },
  } as unknown as HttpAdapterHost;
}

async function interceptWithResponse(response: unknown): Promise<LoggerMock> {
  const interceptor = new LoggingInterceptor(createAdapterHost());
  const logger = { log: vi.fn() };
  Object.defineProperty(interceptor, 'logger', { value: logger });
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

    expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health -> 200/));
  });

  it('logs Fastify-style raw response status', async () => {
    const logger = await interceptWithResponse({ raw: { statusCode: 201 } });

    expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health -> 201/));
  });

  it('logs undefined status when response shape has no numeric status', async () => {
    const logger = await interceptWithResponse({ raw: {} });

    expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health -> undefined/));
  });

  it('logs undefined status when response is not an object', async () => {
    const logger = await interceptWithResponse(undefined);

    expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health -> undefined/));
  });
});
