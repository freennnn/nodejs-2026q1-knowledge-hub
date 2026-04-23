import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@/common/enums/user-role.enum';
import { ROLES_KEY } from '../constants/auth.constants';
import { AuthUser } from '../types/auth-user.type';

type RequestWithUser = {
  user?: AuthUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const role = request.user?.role
    // as long as auth guard passed we can say that request has .user attached and can check
    // if @Roles param decorators mathces the role from request.user

    // JwtAuthGuard skips public routes, so request.user may be undefined there. If someone
    // adds @PublicRoute() and @Roles(...) together, RolesGuard would likely deny (Forbidden)
    // since no user is attached.
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('Insufficient permissions for this operation');
    }

    return true;
  }
}
