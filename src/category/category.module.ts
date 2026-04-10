import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/persistence/persistence.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  imports: [PersistenceModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}

