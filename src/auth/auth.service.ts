import { Injectable } from '@nestjs/common';
import { UserService } from '@/user/user.service';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  signup(dto: SignupDto): Promise<UserResponseDto> {
    return this.userService.create({
      login: dto.login,
      password: dto.password,
    });
  }
}
