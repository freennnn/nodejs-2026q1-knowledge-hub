import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type LoggerService,
  NestInterceptor,
} from '@nestjs/common';
import { type AbstractHttpAdapter, type HttpAdapterHost } from '@nestjs/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEYS = ['password', 'token', 'authorization'];

function readObjectProperty(obj: unknown, property: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;

  return (obj as Record<string, unknown>)[property];
}

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

function shouldRedactKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();

  return SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
}

export function sanitizeLogData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (sanitized, [key, nestedValue]) => {
      sanitized[key] = shouldRedactKey(key) ? REDACTED_VALUE : sanitizeLogData(nestedValue);
      return sanitized;
    },
    {},
  );
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: LoggerService = new Logger(LoggingInterceptor.name),
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const httpAdapter: AbstractHttpAdapter = this.adapterHost.httpAdapter;
    const method = httpAdapter.getRequestMethod(req);
    const url = httpAdapter.getRequestUrl(req);
    const startMs = Date.now();

    this.logger.log(
      'Incoming request',
      {
        method,
        url,
        query: sanitizeLogData(readObjectProperty(req, 'query')),
        body: sanitizeLogData(readObjectProperty(req, 'body')),
      },
      LoggingInterceptor.name,
    );

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startMs;
        const statusCode = readStatusCode(res);
        this.logger.log(
          'Outgoing response',
          {
            method,
            url,
            statusCode,
            responseTimeMs: durationMs,
          },
          LoggingInterceptor.name,
        );
      }),
    );
  }
}
