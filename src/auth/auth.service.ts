import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from 'jsonwebtoken';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { prismaToAppUserRole, UserService } from '@/user/user.service';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TokensResponseDto } from './dto/tokens-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthUser } from './types/auth-user.type';

@Injectable()
export class AuthService {
  private readonly revokedRefreshTokens = new Map<string, number>();
  private readonly accessTokenSecret = process.env.JWT_SECRET_KEY ?? 'access-secret';
  private readonly refreshTokenSecret = process.env.JWT_SECRET_REFRESH_KEY ?? 'refresh-secret';
  private readonly accessTokenTtl = process.env.TOKEN_EXPIRE_TIME ?? '15m';
  private readonly refreshTokenTtl = process.env.TOKEN_REFRESH_EXPIRE_TIME ?? '7d';

  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  signup(dto: SignupDto): Promise<UserResponseDto> {
    return this.userService.create({
      login: dto.login,
      password: dto.password,
    });
  }

  async login(dto: LoginDto): Promise<TokensResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) {
      throw new ForbiddenException('Incorrect login or password');
    }
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Incorrect login or password');
    }

    const payload: AuthUser = {
      userId: user.id,
      login: user.login,
      role: prismaToAppUserRole[user.role],
    };

    return this.issueTokenPair(payload);
  }

  async refresh(dto: RefreshDto): Promise<TokensResponseDto> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    this.cleanupRevokedTokens();
    if (this.isRefreshTokenRevoked(dto.refreshToken)) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    let payload: AuthUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthUser>(dto.refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    return this.issueTokenPair({
      userId: payload.userId,
      login: payload.login,
      role: payload.role,
    });
  }

  async logout(dto: RefreshDto): Promise<void> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    this.cleanupRevokedTokens();

    try {
      await this.jwtService.verifyAsync<AuthUser>(dto.refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    const decoded = this.jwtService.decode(dto.refreshToken);
    const expSeconds = this.extractExp(decoded);
    const nowMs = Date.now();
    const expiresAtMs = expSeconds ? expSeconds * 1000 : nowMs + 24 * 60 * 60 * 1000;
    this.revokedRefreshTokens.set(dto.refreshToken, expiresAtMs);
  }

  private async issueTokenPair(payload: AuthUser): Promise<TokensResponseDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.accessTokenSecret,
        expiresIn: this.accessTokenTtl,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenTtl,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private isRefreshTokenRevoked(token: string): boolean {
    const expiresAtMs = this.revokedRefreshTokens.get(token);
    if (!expiresAtMs) return false;
    if (Date.now() >= expiresAtMs) {
      this.revokedRefreshTokens.delete(token);
      return false;
    }
    return true;
  }

  private cleanupRevokedTokens(): void {
    const nowMs = Date.now();
    for (const [token, expiresAtMs] of this.revokedRefreshTokens.entries()) {
      if (nowMs >= expiresAtMs) {
        this.revokedRefreshTokens.delete(token);
      }
    }
  }

  private extractExp(decoded: string | JwtPayload | null): number | undefined {
    if (!decoded || typeof decoded === 'string') return undefined;
    return typeof decoded.exp === 'number' ? decoded.exp : undefined;
  }
}
