import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/persistence/persistence.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [PersistenceModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
