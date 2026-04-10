import { Injectable } from '@nestjs/common';
import { Article } from '@/common/types/article';
import { Category } from '@/common/types/category';
import { Comment } from '@/common/types/comment';
import { User } from '@/common/types/user';

@Injectable()
export class InMemoryStore {
  readonly users = new Map<string, User>();
  readonly articles = new Map<string, Article>();
  readonly categories = new Map<string, Category>();
  readonly comments = new Map<string, Comment>();
}
