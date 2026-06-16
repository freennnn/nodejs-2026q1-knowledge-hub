import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TokensResponseDto } from './dto/tokens-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PublicRoute } from './decorators/public.decorator';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @PublicRoute()
  @UseGuards(AuthRateLimitGuard)
  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<UserResponseDto> {
    return this.authService.signup(dto);
  }

  @ApiResponse({ status: 200, type: TokensResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Authentication failed' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @HttpCode(200)
  @PublicRoute()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<TokensResponseDto> {
    return this.authService.login(dto);
  }

  @ApiResponse({ status: 200, type: TokensResponseDto })
  @ApiResponse({ status: 401, description: 'No refresh token provided' })
  @ApiResponse({ status: 403, description: 'Invalid or expired refresh token' })
  @HttpCode(200)
  @PublicRoute()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<TokensResponseDto> {
    return this.authService.refresh(dto);
  }

  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'No refresh token provided' })
  @ApiResponse({ status: 403, description: 'Invalid or expired refresh token' })
  @HttpCode(204)
  @PublicRoute()
  @Post('logout')
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto);
  }
}
