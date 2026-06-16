import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type RateBucket = {
  count: number;
  resetAtMs: number;
};

type RequestLike = {
  ip?: string;
  headers?: {
    'x-forwarded-for'?: string | string[];
  };
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, RateBucket>();
  private readonly limit = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10);
  private readonly windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const ip = this.extractIp(request);
    const routeKey = context.getHandler().name;
    const bucketKey = `${ip}:${routeKey}`;
    const nowMs = Date.now();

    const bucket = AuthRateLimitGuard.buckets.get(bucketKey);
    if (!bucket || nowMs >= bucket.resetAtMs) {
      AuthRateLimitGuard.buckets.set(bucketKey, {
        count: 1,
        resetAtMs: nowMs + this.windowMs,
      });
      return true;
    }

    if (bucket.count >= this.limit) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    AuthRateLimitGuard.buckets.set(bucketKey, bucket);
    return true;
  }

  private extractIp(request: RequestLike): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim();
    return forwardedIp || request.ip || 'unknown';
  }
}
