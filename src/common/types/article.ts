import { ArticleStatus } from '@/common/enums/article-status.enum';

/*
- Prisma schema: Article.categoryId String? (nullable column).
- Domain entity: Article.categoryId: string | null (required key, nullable value).
- API DTOs (create, update, list, rag search): categoryId?: string | null with shared transform toNullableUuidInput.
- API normalization: empty/whitespace string -> null.
- Service behavior:
  - create: dto.categoryId ?? null (omitted => persisted as null)
  - update: dto.categoryId (undefined => no change, null => clear field, uuid => set)
  - list/search filters: undefined => no category filter, null => uncategorized only, uuid => specific category.
RAG vector filter keeps same 3-state behavior (!== undefined check).
*/

/*
For categoryId in the app:
  `undefined` is only meaningful in input DTOs / method params (not in persisted entities).
  In JSON, there is no real `undefined` literal value; clients either:
    - omit the field, or
    - send null, UUID string, or some other string.
  "undefined" can be sent only as a string, and it fails UUID validation.

And  current behavior is:
  Create (ArticleService.create): dto.categoryId ?? null
    - omitted/undefined -> stored as null
  Update: categoryId: dto.categoryId
    - omitted/undefined -> no update to that column
    - null -> clear category
    - UUID -> set category
  List/Search filters:
    - omitted/undefined -> skip category filter
    - null -> uncategorized only
    - UUID -> specific category

*/
export interface Article {
  id: string; // uuid v4
  title: string;
  content: string;
  status: ArticleStatus;
  authorId: string | null; // refers to User
  categoryId: string | null; // refers to Category
  tags: string[]; // array of tag names
  createdAt: number; // timestamp of creation
  updatedAt: number; // timestamp of last update
}
