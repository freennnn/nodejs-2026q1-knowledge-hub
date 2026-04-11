import { UserRole } from '@/common/enums/user-role.enum';

export interface User {
  id: string; // uuid v4
  login: string;
  password: string;
  role: UserRole;
  createdAt: number; // timestamp of creation
  updatedAt: number; // timestamp of last update
}
