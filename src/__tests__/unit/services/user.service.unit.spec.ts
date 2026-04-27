import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from '@/user/user.service';
import { UserRole } from '@/common/enums/user-role.enum';
import { authUsers, fixedDate, ids, prismaUsers } from '../fixtures';
import { createPrismaMock, prismaMockProvider, type PrismaMock } from '../mocks/prisma.mock';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [UserService, prismaMockProvider(prisma)],
    }).compile();

    service = moduleRef.get(UserService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns users without passwords', async () => {
    prisma.user.findMany.mockResolvedValue([prismaUsers.admin]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: ids.user,
        login: 'admin',
        role: UserRole.ADMIN,
        createdAt: fixedDate.getTime(),
        updatedAt: fixedDate.getTime(),
      },
    ]);
  });

  it('throws NotFoundException when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findOne(ids.user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an existing user without password', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUsers.admin);

    await expect(service.findOne(ids.user)).resolves.toEqual({
      id: ids.user,
      login: 'admin',
      role: UserRole.ADMIN,
      createdAt: fixedDate.getTime(),
      updatedAt: fixedDate.getTime(),
    });
  });

  it('hashes password and assigns viewer role by default on create', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    prisma.user.create.mockResolvedValue(prismaUsers.viewer);

    const result = await service.create({ login: 'viewer', password: 'plain-password' });

    expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', expect.any(Number));
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        login: 'viewer',
        password: 'hashed-password',
        role: PrismaUserRole.VIEWER,
      },
    });
    expect(result).not.toHaveProperty('password');
    expect(result.role).toBe(UserRole.VIEWER);
  });

  it('uses explicit role when creating user', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    prisma.user.create.mockResolvedValue(prismaUsers.editor);

    await service.create({
      login: 'editor',
      password: 'plain-password',
      role: UserRole.EDITOR,
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        login: 'editor',
        password: 'hashed-password',
        role: PrismaUserRole.EDITOR,
      },
    });
  });

  it('converts duplicate login errors into BadRequestException', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'unit-test',
      }),
    );

    await expect(
      service.create({ login: 'admin', password: 'plain-password' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rethrows unexpected create errors', async () => {
    const error = new Error('database unavailable');
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    prisma.user.create.mockRejectedValue(error);

    await expect(service.create({ login: 'admin', password: 'plain-password' })).rejects.toBe(
      error,
    );
  });

  it('allows admins to update user roles', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUsers.viewer);
    prisma.user.update.mockResolvedValue({ ...prismaUsers.viewer, role: PrismaUserRole.EDITOR });

    const result = await service.update(ids.viewer, { role: UserRole.EDITOR }, authUsers.admin);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: ids.viewer },
      data: { role: PrismaUserRole.EDITOR },
    });
    expect(result.role).toBe(UserRole.EDITOR);
  });

  it('forbids non-admin role updates', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUsers.viewer);

    await expect(
      service.update(ids.viewer, { role: UserRole.EDITOR }, authUsers.editor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires password fields when update does not include role', async () => {
    await expect(service.update(ids.viewer, {}, authUsers.admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updates own password after validating old password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);
    prisma.user.findUnique.mockResolvedValue(prismaUsers.viewer);
    prisma.user.update.mockResolvedValue({ ...prismaUsers.viewer, password: 'new-hash' });

    await service.update(
      ids.viewer,
      { oldPassword: 'old-password', newPassword: 'new-password' },
      authUsers.viewer,
    );

    expect(bcrypt.compare).toHaveBeenCalledWith('old-password', 'hashed-password');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: ids.viewer },
      data: { password: 'new-hash' },
    });
  });

  it('forbids non-admins from updating another user password', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUsers.viewer);

    await expect(
      service.update(
        ids.viewer,
        { oldPassword: 'old-password', newPassword: 'new-password' },
        authUsers.editor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids password update when old password is wrong', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    prisma.user.findUnique.mockResolvedValue(prismaUsers.viewer);

    await expect(
      service.update(
        ids.viewer,
        { oldPassword: 'old-password', newPassword: 'new-password' },
        authUsers.viewer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException before removing missing users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.remove(ids.user)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('removes existing users', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ids.user });
    prisma.user.delete.mockResolvedValue(prismaUsers.admin);

    await expect(service.remove(ids.user)).resolves.toBeUndefined();
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: ids.user } });
  });
});
