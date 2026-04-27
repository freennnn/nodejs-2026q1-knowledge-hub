import { JwtService } from '@nestjs/jwt';
import { vi } from 'vitest';

export function createJwtServiceMock() {
  return {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
    decode: vi.fn(),
  };
}

export const jwtServiceMockProvider = (jwtService = createJwtServiceMock()) => ({
  provide: JwtService,
  useValue: jwtService,
});
