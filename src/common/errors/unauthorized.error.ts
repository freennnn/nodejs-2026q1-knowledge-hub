import { HttpStatus } from '@nestjs/common';
import { CustomHttpError } from '@/common/errors/custom-http.error';

export class UnauthorizedError extends CustomHttpError {
  readonly statusCode = HttpStatus.UNAUTHORIZED;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = UnauthorizedError.name;
  }
}
