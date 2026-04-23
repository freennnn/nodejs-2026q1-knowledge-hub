import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

type Role = 'viewer' | 'editor' | 'admin';

const appToPrismaRole: Record<Role, UserRole> = {
  viewer: UserRole.VIEWER,
  editor: UserRole.EDITOR,
  admin: UserRole.ADMIN,
};

const promoteUserRole = async (userId: string, role: Role): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { role: appToPrismaRole[role] },
  });
};

export default promoteUserRole;
