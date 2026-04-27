import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { UserRole } from '@/common/enums/user-role.enum';
import { authUsers } from '../fixtures';
import { createHttpExecutionContext } from '../helpers/execution-context';
import { createReflectorMock } from '../mocks/reflector.mock';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: ReturnType<typeof createReflectorMock>;

  beforeEach(async () => {
    reflector = createReflectorMock();
    const moduleRef = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = moduleRef.get(RolesGuard);
  });

  it('allows access when @Roles metadata is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createHttpExecutionContext())).toBe(true);
  });

  it('allows access when @Roles metadata is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(createHttpExecutionContext())).toBe(true);
  });

  it('allows access when user role is included in required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createHttpExecutionContext({
      request: { user: authUsers.admin },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when request has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(createHttpExecutionContext({ request: {} }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when user role is insufficient', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createHttpExecutionContext({
      request: { user: authUsers.viewer },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
