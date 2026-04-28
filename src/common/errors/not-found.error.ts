import { HttpStatus } from '@nestjs/common';
import { CustomHttpError } from '@/common/errors/custom-http.error';

export class NotFoundError extends CustomHttpError {
  readonly statusCode = HttpStatus.NOT_FOUND;

  constructor(message = 'Resource not found') {
    super(message);
    this.name = NotFoundError.name;
  }
}
