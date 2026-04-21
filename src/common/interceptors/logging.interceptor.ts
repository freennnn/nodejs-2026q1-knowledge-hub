import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { type AbstractHttpAdapter, type HttpAdapterHost } from '@nestjs/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

function readStatusCode(res: unknown): number | undefined {
  if (!res || typeof res !== 'object') return undefined;

  // Express: res.statusCode
  const maybe = res as { statusCode?: unknown; raw?: unknown };
  if (typeof maybe.statusCode === 'number') return maybe.statusCode;

  // Fastify: commonly reply.raw.statusCode
  if (!maybe.raw || typeof maybe.raw !== 'object') return undefined;
  const raw = maybe.raw as Record<string, unknown>;
  const rawStatus = raw['statusCode'];
  return typeof rawStatus === 'number' ? rawStatus : undefined;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const httpAdapter: AbstractHttpAdapter = this.adapterHost.httpAdapter;
    const method = httpAdapter.getRequestMethod(req);
    const url = httpAdapter.getRequestUrl(req);
    const startMs = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startMs;
        const statusCode = readStatusCode(res);
        this.logger.log(`${method} ${url} -> ${statusCode} (${durationMs}ms)`);
      }),
    );
  }
}
