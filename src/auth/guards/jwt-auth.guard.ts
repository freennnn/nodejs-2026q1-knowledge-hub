import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../constants/auth.constants';
import { AuthUser } from '../types/auth-user.type';

type RequestWithUser = {
  path: string;
  headers: {
    authorization?: string | string[];
  };
  user?: AuthUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly accessTokenSecret = process.env.JWT_SECRET_KEY ?? 'access-secret';

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublicRoute) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (this.isSwaggerPath(request.path)) return true;

    const authorizationHeader = request.headers.authorization;
    const authorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;
    if (!authorization) {
      throw new UnauthorizedException('Access token is missing or invalid');
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Access token is missing or invalid');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: this.accessTokenSecret,
      });
      // attaching user to request so everything downstream can use user info without verifying/parsing token
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Access token is missing or invalid');
    }
  }

  private isSwaggerPath(path: string): boolean {
    return path.startsWith('/doc');
  }
}
