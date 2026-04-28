import { HttpStatus } from '@nestjs/common';
import { CustomHttpError } from '@/common/errors/custom-http.error';

export class ValidationError extends CustomHttpError {
  readonly statusCode = HttpStatus.BAD_REQUEST;

  constructor(message = 'Validation failed') {
    super(message);
    this.name = ValidationError.name;
  }
}
