import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PersistenceModule } from '@/persistence/persistence.module';
import { UserModule } from '@/user/user.module';
import { CategoryModule } from '@/category/category.module';
import { ArticleModule } from '@/article/article.module';
import { CommentModule } from '@/comment/comment.module';

@Module({
  imports: [
    PersistenceModule,
    UserModule,
    CategoryModule,
    ArticleModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
