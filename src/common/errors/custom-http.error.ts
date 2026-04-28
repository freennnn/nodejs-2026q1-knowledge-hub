export abstract class CustomHttpError extends Error {
  abstract readonly statusCode: number;

  protected constructor(message: string) {
    super(message);
  }
}

export function isCustomHttpError(error: unknown): error is CustomHttpError {
  return error instanceof CustomHttpError;
}
