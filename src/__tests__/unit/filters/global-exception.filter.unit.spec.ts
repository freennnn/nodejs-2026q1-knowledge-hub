import { ArgumentsHost, BadRequestException, HttpStatus, type LoggerService } from '@nestjs/common';
import { type HttpAdapterHost } from '@nestjs/core';
import { describe, expect, it, type Mock, vi } from 'vitest';
import { NotFoundError } from '@/common/errors/not-found.error';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';

type LoggerMock = {
  error: Mock;
  log: Mock;
  warn: Mock;
};

function createLoggerMock(): LoggerMock {
  return {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  };
}

function createAdapterHost() {
  const reply = vi.fn();

  return {
    adapterHost: {
      httpAdapter: {
        reply,
      },
    } as unknown as HttpAdapterHost,
    reply,
  };
}

function createArgumentsHost(response: unknown = {}): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  it('returns custom error status and message', () => {
    const { adapterHost, reply } = createAdapterHost();
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(adapterHost, logger as LoggerService);
    const response = {};

    filter.catch(new NotFoundError('Article not found'), createArgumentsHost(response));

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Article not found',
      },
      HttpStatus.NOT_FOUND,
    );
  });

  it('preserves Nest HttpException status and response message', () => {
    const { adapterHost, reply } = createAdapterHost();
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(adapterHost, logger as LoggerService);
    const response = {};

    filter.catch(
      new BadRequestException(['title should not be empty']),
      createArgumentsHost(response),
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: ['title should not be empty'],
      },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('returns assignment-safe 500 body for unknown errors', () => {
    const { adapterHost, reply } = createAdapterHost();
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(adapterHost, logger as LoggerService);
    const response = {};

    filter.catch(new Error('Database exploded'), createArgumentsHost(response));

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('logs exceptions with stack trace at error level', () => {
    const { adapterHost } = createAdapterHost();
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(adapterHost, logger as LoggerService);
    const error = new Error('Failure');

    filter.catch(error, createArgumentsHost());

    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled request error: Failure',
      error.stack,
      'GlobalExceptionFilter',
    );
  });
});
