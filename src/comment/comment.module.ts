import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/persistence/persistence.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [PersistenceModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
