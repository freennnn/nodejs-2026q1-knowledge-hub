import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { authUsers } from '../fixtures';
import { createHttpExecutionContext } from '../helpers/execution-context';
import { createJwtServiceMock } from '../mocks/jwt.mock';
import { createReflectorMock } from '../mocks/reflector.mock';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: ReturnType<typeof createJwtServiceMock>;
  let reflector: ReturnType<typeof createReflectorMock>;

  beforeEach(async () => {
    jwtService = createJwtServiceMock();
    reflector = createReflectorMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
  });

  it('allows public routes without verifying token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createHttpExecutionContext({
      request: { path: '/auth/login', headers: {} },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('allows Swagger documentation paths without verifying token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createHttpExecutionContext({
      request: { path: '/doc', headers: {} },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('verifies bearer token and attaches user to request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue(authUsers.admin);
    const request = {
      path: '/users',
      headers: { authorization: 'Bearer access-token' },
    };
    const context = createHttpExecutionContext({ request });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('access-token', {
      secret: 'access-secret',
    });
    expect(request).toHaveProperty('user', authUsers.admin);
  });

  it('uses the first authorization value when header is an array', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue(authUsers.viewer);
    const request = {
      path: '/articles',
      headers: { authorization: ['Bearer first-token', 'Bearer second-token'] },
    };

    await expect(guard.canActivate(createHttpExecutionContext({ request }))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('first-token', {
      secret: 'access-secret',
    });
  });

  it('throws UnauthorizedException when token is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createHttpExecutionContext({
      request: { path: '/users', headers: {} },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when authorization header is malformed', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createHttpExecutionContext({
      request: { path: '/users', headers: { authorization: 'Basic token' } },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when JWT verification fails', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const context = createHttpExecutionContext({
      request: { path: '/users', headers: { authorization: 'Bearer expired-token' } },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
