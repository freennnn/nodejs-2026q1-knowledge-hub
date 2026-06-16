import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export const SEED_ADMIN_LOGIN = 'TEST_SEED_ADMIN';
export const SEED_ADMIN_PASSWORD = 'TestSeedAdmin123!';

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
  });
  const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);

  try {
    await prisma.user.upsert({
      where: { login: SEED_ADMIN_LOGIN },
      update: { role: UserRole.ADMIN, password: hashedPassword },
      create: {
        login: SEED_ADMIN_LOGIN,
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
