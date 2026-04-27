import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CategoryService } from '@/category/category.service';
import { ids } from '../fixtures';
import { createPrismaMock, prismaMockProvider, type PrismaMock } from '../mocks/prisma.mock';

const category = {
  id: ids.category,
  name: 'Node.js',
  description: 'Backend runtime',
};

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [CategoryService, prismaMockProvider(prisma)],
    }).compile();

    service = moduleRef.get(CategoryService);
  });

  it('returns all categories', async () => {
    prisma.category.findMany.mockResolvedValue([category]);

    await expect(service.findAll()).resolves.toEqual([category]);
  });

  it('throws NotFoundException when category does not exist', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(service.findOne(ids.category)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an existing category', async () => {
    prisma.category.findUnique.mockResolvedValue(category);

    await expect(service.findOne(ids.category)).resolves.toEqual(category);
  });

  it('creates categories through Prisma', async () => {
    prisma.category.create.mockResolvedValue(category);

    await expect(
      service.create({ name: 'Node.js', description: 'Backend runtime' }),
    ).resolves.toEqual(category);

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        name: 'Node.js',
        description: 'Backend runtime',
      },
    });
  });

  it('updates existing categories', async () => {
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.category.update.mockResolvedValue({ ...category, name: 'NestJS' });

    await expect(
      service.update(ids.category, { name: 'NestJS', description: 'Nest framework' }),
    ).resolves.toEqual({
      ...category,
      name: 'NestJS',
    });

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: ids.category },
      data: {
        name: 'NestJS',
        description: 'Nest framework',
      },
    });
  });

  it('throws NotFoundException before updating missing categories', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(
      service.update(ids.category, { name: 'NestJS', description: 'Nest framework' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException before deleting missing categories', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(service.remove(ids.category)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('deletes existing categories', async () => {
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.category.delete.mockResolvedValue(category);

    await expect(service.remove(ids.category)).resolves.toBeUndefined();
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: ids.category } });
  });
});
