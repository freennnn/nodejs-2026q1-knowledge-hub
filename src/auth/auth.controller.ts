import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TokensResponseDto } from './dto/tokens-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PublicRoute } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @PublicRoute()
  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<UserResponseDto> {
    return this.authService.signup(dto);
  }

  @ApiResponse({ status: 200, type: TokensResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Authentication failed' })
  @HttpCode(200)
  @PublicRoute()
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
}
