import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PublicRoute } from '@/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @PublicRoute()
  getHealth() {
    return this.appService.getHealth();
  }
}
