import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PersistenceModule } from '@/persistence/persistence.module';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [PersistenceModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
