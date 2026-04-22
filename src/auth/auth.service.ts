import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@/common/enums/user-role.enum';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { prismaToAppUserRole, UserService } from '@/user/user.service';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TokensResponseDto } from './dto/tokens-response.dto';
import { RefreshDto } from './dto/refresh.dto';

type TokenPayload = {
  userId: string;
  login: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  private readonly accessTokenSecret =
    process.env.JWT_SECRET_KEY ?? process.env.JWT_SECRET ?? 'access-secret';
  private readonly refreshTokenSecret =
    process.env.JWT_SECRET_REFRESH_KEY ?? process.env.JWT_REFRESH_SECRET ?? 'refresh-secret';
  private readonly accessTokenTtl =
    process.env.TOKEN_EXPIRE_TIME ?? process.env.JWT_ACCESS_TTL ?? '15m';
  private readonly refreshTokenTtl =
    process.env.TOKEN_REFRESH_EXPIRE_TIME ?? process.env.JWT_REFRESH_TTL ?? '7d';

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

    const payload: TokenPayload = {
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

    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(dto.refreshToken, {
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

  private async issueTokenPair(payload: TokenPayload): Promise<TokensResponseDto> {
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
}
