import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/persistence/persistence.module';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';

@Module({
  imports: [PersistenceModule],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}
