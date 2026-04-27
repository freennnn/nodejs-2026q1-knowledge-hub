import { vi, type Mock } from 'vitest';
import { PrismaService } from '@/persistence/prisma/prisma.service';

type MockFn = Mock<(...args: unknown[]) => unknown>;

type PrismaDelegateMock = {
  findMany: MockFn;
  findUnique: MockFn;
  create: MockFn;
  update: MockFn;
  delete: MockFn;
  count: MockFn;
};

export type PrismaMock = {
  user: PrismaDelegateMock;
  article: PrismaDelegateMock;
  category: PrismaDelegateMock;
  comment: PrismaDelegateMock;
  tag: PrismaDelegateMock;
  $transaction: MockFn;
  $connect: MockFn;
  $disconnect: MockFn;
};

function createDelegateMock(): PrismaDelegateMock {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
}

export function createPrismaMock(): PrismaMock {
  const prisma = {
    user: createDelegateMock(),
    article: createDelegateMock(),
    category: createDelegateMock(),
    comment: createDelegateMock(),
    tag: createDelegateMock(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      return input(prisma);
    }

    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    return input;
  });

  return prisma;
}

export const prismaMockProvider = (prisma: PrismaMock = createPrismaMock()) => ({
  provide: PrismaService,
  useValue: prisma,
});
