import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/persistence/persistence.module';
import { RagModule } from '@/rag/rag.module';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';

@Module({
  imports: [PersistenceModule, RagModule],
  controllers: [ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
