import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  type LoggerService,
} from '@nestjs/common';
import { type AbstractHttpAdapter, type HttpAdapterHost } from '@nestjs/core';
import { getReasonPhrase } from 'http-status-codes';
import { isCustomHttpError } from '@/common/errors/custom-http.error';

type ErrorResponseBody = {
  statusCode: number;
  error: string;
  message: string | string[];
};

const UNKNOWN_ERROR_RESPONSE: ErrorResponseBody = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  error: 'Internal Server Error',
  message: 'An unexpected error occurred',
};

function getReasonPhraseSafe(statusCode: number): string {
  try {
    return getReasonPhrase(statusCode);
  } catch {
    return UNKNOWN_ERROR_RESPONSE.error;
  }
}

function normalizeHttpException(exception: HttpException): ErrorResponseBody {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return {
      statusCode,
      error: getReasonPhraseSafe(statusCode),
      message: response,
    };
  }

  if (response && typeof response === 'object') {
    const responseBody = response as Record<string, unknown>;
    const message = responseBody['message'];
    const error = responseBody['error'];

    return {
      statusCode,
      error: typeof error === 'string' ? error : getReasonPhraseSafe(statusCode),
      message:
        typeof message === 'string' || Array.isArray(message)
          ? message
          : exception.message || getReasonPhraseSafe(statusCode),
    };
  }

  return {
    statusCode,
    error: getReasonPhraseSafe(statusCode),
    message: exception.message || getReasonPhraseSafe(statusCode),
  };
}

function normalizeException(exception: unknown): ErrorResponseBody {
  if (isCustomHttpError(exception)) {
    return {
      statusCode: exception.statusCode,
      error: getReasonPhraseSafe(exception.statusCode),
      message: exception.message,
    };
  }

  if (exception instanceof HttpException) {
    return normalizeHttpException(exception);
  }

  return UNKNOWN_ERROR_RESPONSE;
}

function getErrorStack(exception: unknown): string | undefined {
  return exception instanceof Error ? exception.stack : undefined;
}

function getErrorMessage(exception: unknown): string {
  if (exception instanceof Error) return exception.message;
  return String(exception);
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: LoggerService = new Logger(GlobalExceptionFilter.name),
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const httpAdapter: AbstractHttpAdapter = this.adapterHost.httpAdapter;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const responseBody = normalizeException(exception);

    this.logger.error(
      `Unhandled request error: ${getErrorMessage(exception)}`,
      getErrorStack(exception),
      GlobalExceptionFilter.name,
    );

    httpAdapter.reply(response, responseBody, responseBody.statusCode);
  }
}
