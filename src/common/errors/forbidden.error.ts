import { HttpStatus } from '@nestjs/common';
import { CustomHttpError } from '@/common/errors/custom-http.error';

export class ForbiddenError extends CustomHttpError {
  readonly statusCode = HttpStatus.FORBIDDEN;

  constructor(message = 'Forbidden') {
    super(message);
    this.name = ForbiddenError.name;
  }
}
