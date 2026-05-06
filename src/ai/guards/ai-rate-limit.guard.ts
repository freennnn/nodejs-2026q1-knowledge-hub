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

type AuthenticatedUserLike = {
  userId?: string;
};

type RequestLike = {
  user?: AuthenticatedUserLike;
  ip?: string;
  headers?: {
    'x-forwarded-for'?: string | string[];
  };
};

type ResponseLike = {
  setHeader?: (name: string, value: string) => void;
  header?: (name: string, value: string) => void;
};

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, RateBucket>();
  private static readonly windowMs = 60_000;
  private readonly limit = Number(process.env.AI_RATE_LIMIT_RPM ?? 20);

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const bucketKey = this.buildBucketKey(request);
    const nowMs = Date.now();

    const bucket = AiRateLimitGuard.buckets.get(bucketKey);
    if (!bucket || nowMs >= bucket.resetAtMs) {
      AiRateLimitGuard.buckets.set(bucketKey, {
        count: 1,
        resetAtMs: nowMs + AiRateLimitGuard.windowMs,
      });
      return true;
    }

    if (bucket.count >= this.limit) {
      const retryAfterSeconds = Math.ceil((bucket.resetAtMs - nowMs) / 1000);
      this.setRetryAfterHeader(response, retryAfterSeconds);
      throw new HttpException(
        'Too many AI requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    AiRateLimitGuard.buckets.set(bucketKey, bucket);
    return true;
  }

  private buildBucketKey(request: RequestLike): string {
    const userId = request.user?.userId;
    if (typeof userId === 'string' && userId.trim().length > 0) {
      return `ai:${userId}`;
    }
    return `ai:${this.extractIp(request)}`;
  }

  private setRetryAfterHeader(response: ResponseLike, retryAfterSeconds: number): void {
    const value = String(retryAfterSeconds);
    if (typeof response.setHeader === 'function') {
      response.setHeader('Retry-After', value);
      return;
    }
    if (typeof response.header === 'function') {
      response.header('Retry-After', value);
    }
  }

  private extractIp(request: RequestLike): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim();
    return forwardedIp || request.ip || 'unknown';
  }
}
