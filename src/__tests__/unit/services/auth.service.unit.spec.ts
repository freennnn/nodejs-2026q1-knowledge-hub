import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/auth/auth.service';
import { UserRole } from '@/common/enums/user-role.enum';
import { UserService } from '@/user/user.service';
import { authUsers, fixedDate, ids, prismaUsers } from '../fixtures';
import { createJwtServiceMock } from '../mocks/jwt.mock';
import { createPrismaMock, prismaMockProvider, type PrismaMock } from '../mocks/prisma.mock';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let jwtService: ReturnType<typeof createJwtServiceMock>;
  let userService: { create: ReturnType<typeof vi.fn> };
  type AuthServiceInternals = {
    revokedRefreshTokens: Map<string, number>;
    isRefreshTokenRevoked(token: string): boolean;
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    jwtService = createJwtServiceMock();
    userService = {
      create: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        prismaMockProvider(prisma),
        { provide: JwtService, useValue: jwtService },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('delegates signup to UserService without accepting a client-supplied role', async () => {
    userService.create.mockResolvedValue({
      id: ids.viewer,
      login: 'viewer',
      role: UserRole.VIEWER,
      createdAt: fixedDate.getTime(),
      updatedAt: fixedDate.getTime(),
    });

    await service.signup({ login: 'viewer', password: 'plain-password' });

    expect(userService.create).toHaveBeenCalledWith({
      login: 'viewer',
      password: 'plain-password',
    });
  });

  it('generates access and refresh JWTs on successful login', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    prisma.user.findUnique.mockResolvedValue({
      ...prismaUsers.editor,
      role: PrismaUserRole.EDITOR,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    await expect(service.login({ login: 'editor', password: 'plain-password' })).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const expectedPayload = {
      userId: ids.editor,
      login: 'editor',
      role: UserRole.EDITOR,
    };
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expectedPayload,
      expect.objectContaining({ secret: 'access-secret' }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expectedPayload,
      expect.objectContaining({ secret: 'refresh-secret' }),
    );
  });

  it('throws ForbiddenException for unknown login', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ login: 'missing', password: 'plain-password' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException for invalid password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    prisma.user.findUnique.mockResolvedValue(prismaUsers.viewer);

    await expect(
      service.login({ login: 'viewer', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('verifies refresh token and issues a rotated token pair', async () => {
    jwtService.verifyAsync.mockResolvedValue(authUsers.viewer);
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    await expect(service.refresh({ refreshToken: 'old-refresh-token' })).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('old-refresh-token', {
      secret: 'refresh-secret',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      authUsers.viewer,
      expect.objectContaining({ secret: 'access-secret' }),
    );
  });

  it('throws UnauthorizedException when refresh token is missing', async () => {
    await expect(service.refresh({ refreshToken: '' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException for expired or tampered refresh tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(service.refresh({ refreshToken: 'tampered-token' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('revokes refresh token on logout and rejects it later', async () => {
    jwtService.verifyAsync.mockResolvedValue(authUsers.viewer);
    jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 60 });

    await service.logout({ refreshToken: 'refresh-token' });

    await expect(service.refresh({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws UnauthorizedException when logout refresh token is missing', async () => {
    await expect(service.logout({ refreshToken: '' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when logout receives invalid refresh token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

    await expect(service.logout({ refreshToken: 'bad-refresh-token' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows refresh when an old revoked token entry has already expired', async () => {
    jwtService.verifyAsync.mockResolvedValue(authUsers.viewer);
    jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 1 });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    await service.logout({ refreshToken: 'expired-revocation' });

    await expect(service.refresh({ refreshToken: 'expired-revocation' })).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('uses fallback revocation expiry when token payload has no exp', async () => {
    jwtService.verifyAsync.mockResolvedValue(authUsers.viewer);
    jwtService.decode.mockReturnValue('not-a-json-payload');

    await expect(service.logout({ refreshToken: 'opaque-refresh-token' })).resolves.toBeUndefined();
  });

  it('uses fallback revocation expiry when decoded exp is not numeric', async () => {
    jwtService.verifyAsync.mockResolvedValue(authUsers.viewer);
    jwtService.decode.mockReturnValue({ exp: 'not-a-number' });

    await expect(
      service.logout({ refreshToken: 'non-numeric-exp-token' }),
    ).resolves.toBeUndefined();
  });

  it('drops expired revoked token entries when checking revocation state', () => {
    const internals = service as unknown as AuthServiceInternals;
    internals.revokedRefreshTokens.set('expired-token', Date.now() - 1);

    expect(internals.isRefreshTokenRevoked('expired-token')).toBe(false);
    expect(internals.revokedRefreshTokens.has('expired-token')).toBe(false);
  });
});
