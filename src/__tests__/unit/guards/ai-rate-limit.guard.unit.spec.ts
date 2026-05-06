import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiRateLimitGuard } from '@/ai/guards/ai-rate-limit.guard';
import { createHttpExecutionContext } from '../helpers/execution-context';

type AiRateLimitGuardInternals = {
  buckets: Map<string, unknown>;
};

function resetRateLimitBuckets(): void {
  const guardClass = AiRateLimitGuard as unknown as AiRateLimitGuardInternals;
  guardClass.buckets.clear();
}

describe('AiRateLimitGuard', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    vi.restoreAllMocks();
    delete process.env.AI_RATE_LIMIT_RPM;
  });

  it('allows requests until configured limit is reached', () => {
    process.env.AI_RATE_LIMIT_RPM = '2';
    const guard = new AiRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { user: { userId: 'u-1' }, headers: {} },
      response: { setHeader: vi.fn() },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws 429 and sets Retry-After when limit is exceeded', () => {
    process.env.AI_RATE_LIMIT_RPM = '1';
    const setHeader = vi.fn();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(10_000).mockReturnValueOnce(10_001);
    const guard = new AiRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { user: { userId: 'u-1' }, headers: {} },
      response: { setHeader },
    });

    expect(guard.canActivate(context)).toBe(true);
    let thrown: unknown;
    try {
      guard.canActivate(context);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });

  it('uses userId bucket before IP when authenticated', () => {
    process.env.AI_RATE_LIMIT_RPM = '1';
    const guard = new AiRateLimitGuard();

    const firstUserContext = createHttpExecutionContext({
      request: { user: { userId: 'u-1' }, ip: '10.0.0.1', headers: {} },
      response: { setHeader: vi.fn() },
    });
    const sameIpDifferentUserContext = createHttpExecutionContext({
      request: { user: { userId: 'u-2' }, ip: '10.0.0.1', headers: {} },
      response: { setHeader: vi.fn() },
    });

    expect(guard.canActivate(firstUserContext)).toBe(true);
    expect(guard.canActivate(sameIpDifferentUserContext)).toBe(true);
  });

  it('falls back to IP bucket when user is missing', () => {
    process.env.AI_RATE_LIMIT_RPM = '1';
    const guard = new AiRateLimitGuard();
    const context = createHttpExecutionContext({
      request: { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } },
      response: { setHeader: vi.fn() },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });
});
