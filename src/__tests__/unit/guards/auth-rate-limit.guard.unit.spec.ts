import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRateLimitGuard } from '@/auth/guards/auth-rate-limit.guard';
import { createHttpExecutionContext } from '../helpers/execution-context';

type AuthRateLimitGuardInternals = {
  buckets: Map<string, unknown>;
};

function resetRateLimitBuckets(): void {
  const guardClass = AuthRateLimitGuard as unknown as AuthRateLimitGuardInternals;
  guardClass.buckets.clear();
}

function handler() {
  return undefined;
}

describe('AuthRateLimitGuard', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    vi.restoreAllMocks();
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
  });

  it('allows first request and tracks it by IP and route', () => {
    const guard = new AuthRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { ip: '127.0.0.1', headers: {} },
      handler,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows requests until configured limit is reached', () => {
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    const guard = new AuthRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { ip: '127.0.0.1', headers: {} },
      handler,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws 429 after configured limit is exceeded', () => {
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const guard = new AuthRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { ip: '127.0.0.1', headers: {} },
      handler,
    });

    expect(guard.canActivate(context)).toBe(true);

    expect(() => guard.canActivate(context)).toThrow(HttpException);
    try {
      guard.canActivate(context);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('resets the bucket after the configured window expires', () => {
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '100';
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(1_101);
    const guard = new AuthRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { ip: '127.0.0.1', headers: {} },
      handler,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('uses first x-forwarded-for IP when header is an array', () => {
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const guard = new AuthRateLimitGuard();
    const forwardedContext = createHttpExecutionContext({
      request: { ip: '127.0.0.1', headers: { 'x-forwarded-for': ['10.0.0.1'] } },
      handler,
    });
    const directContext = createHttpExecutionContext({
      request: { ip: '127.0.0.1', headers: {} },
      handler,
    });

    expect(guard.canActivate(forwardedContext)).toBe(true);
    expect(guard.canActivate(directContext)).toBe(true);
  });

  it('uses first comma-separated x-forwarded-for IP', () => {
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const guard = new AuthRateLimitGuard();
    const firstContext = createHttpExecutionContext({
      request: { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } },
      handler,
    });
    const secondContext = createHttpExecutionContext({
      request: { headers: { 'x-forwarded-for': '10.0.0.2' } },
      handler,
    });

    expect(guard.canActivate(firstContext)).toBe(true);
    expect(guard.canActivate(secondContext)).toBe(true);
  });

  it('falls back to unknown when request has no IP headers', () => {
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const guard = new AuthRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { headers: {} },
      handler,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });
});
