import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';

export function createReflectorMock() {
  return {
    getAllAndOverride: vi.fn(),
  };
}

export const reflectorMockProvider = (reflector = createReflectorMock()) => ({
  provide: Reflector,
  useValue: reflector,
});
