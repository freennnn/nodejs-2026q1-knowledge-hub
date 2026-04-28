import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ForbiddenError } from '@/common/errors/forbidden.error';
import { isCustomHttpError } from '@/common/errors/custom-http.error';
import { NotFoundError } from '@/common/errors/not-found.error';
import { UnauthorizedError } from '@/common/errors/unauthorized.error';
import { ValidationError } from '@/common/errors/validation.error';

describe('custom HTTP errors', () => {
  it.each([
    [new NotFoundError('Missing article'), HttpStatus.NOT_FOUND, 'NotFoundError'],
    [new ValidationError('Invalid input'), HttpStatus.BAD_REQUEST, 'ValidationError'],
    [new UnauthorizedError('Login required'), HttpStatus.UNAUTHORIZED, 'UnauthorizedError'],
    [new ForbiddenError('Insufficient role'), HttpStatus.FORBIDDEN, 'ForbiddenError'],
  ])('sets status code and name for %s', (error, statusCode, name) => {
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(statusCode);
    expect(error.name).toBe(name);
    expect(isCustomHttpError(error)).toBe(true);
  });

  it('does not treat plain errors as custom HTTP errors', () => {
    expect(isCustomHttpError(new Error('Boom'))).toBe(false);
  });

  it('does not treat arbitrary statusCode errors as custom HTTP errors', () => {
    const error = Object.assign(new Error('Boom'), { statusCode: HttpStatus.NOT_FOUND });

    expect(isCustomHttpError(error)).toBe(false);
  });
});
