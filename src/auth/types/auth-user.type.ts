import { UserRole } from '@/common/enums/user-role.enum';

export type AuthUser = {
  userId: string;
  login: string;
  role: UserRole;
};
