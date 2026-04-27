import { ExecutionContext, Type } from '@nestjs/common';
import { vi } from 'vitest';

type HttpContextOptions = {
  request?: unknown;
  response?: unknown;
  handler?: (...args: unknown[]) => unknown;
  classRef?: Type<unknown>;
};

export function createHttpExecutionContext({
  request = {},
  response = {},
  handler = vi.fn(),
  classRef = class TestController {},
}: HttpContextOptions = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => classRef,
    getArgs: () => [request, response],
    getArgByIndex: (index: number) => [request, response][index],
    switchToRpc: vi.fn(),
    switchToWs: vi.fn(),
    getType: () => 'http',
  } as unknown as ExecutionContext;
}
