import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Article } from '@/common/types/article';
import { Category } from '@/common/types/category';
import { InMemoryStore } from '@/persistence/in-memory/in-memory.store';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly store: InMemoryStore) {}

  findAll(): Category[] {
    return [...this.store.categories.values()];
  }

  findOne(id: string): Category {
    const category = this.store.categories.get(id);
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    return category;
  }

  create(dto: CreateCategoryDto): Category {
    const category: Category = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
    };
    this.store.categories.set(category.id, category);
    return category;
  }

  update(id: string, dto: UpdateCategoryDto): Category {
    const category = this.store.categories.get(id);
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    const updated: Category = { ...category, name: dto.name, description: dto.description };
    this.store.categories.set(id, updated);
    return updated;
  }

  remove(id: string): void {
    const category = this.store.categories.get(id);
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    // Cascade: null categoryId in Articles
    for (const [articleId, article] of this.store.articles.entries()) {
      if (article.categoryId === id) {
        const updated: Article = {
          ...article,
          categoryId: null,
          updatedAt: Date.now(),
        };
        this.store.articles.set(articleId, updated);
      }
    }

    this.store.categories.delete(id);
  }
}
