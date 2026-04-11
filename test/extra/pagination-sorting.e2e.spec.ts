import { StatusCodes } from 'http-status-codes';
import { validate } from 'uuid';
import { request } from '../lib';
import {
  getTokenAndUserId,
  removeTokenUser,
  shouldAuthorizationBeTested,
} from '../utils';
import {
  articlesRoutes,
  categoriesRoutes,
  commentsRoutes,
  usersRoutes,
} from '../endpoints';

describe('Extra: pagination + sorting (e2e)', () => {
  const unauthorizedRequest = request;
  const commonHeaders: Record<string, string> = { Accept: 'application/json' };
  let mockUserId: string | undefined;

  const createdUserIds: string[] = [];
  const createdCategoryIds: string[] = [];
  const createdArticleIds: string[] = [];
  const createdCommentIds: string[] = [];

  beforeAll(async () => {
    if (shouldAuthorizationBeTested) {
      const result = await getTokenAndUserId(unauthorizedRequest);
      commonHeaders['Authorization'] = result.token;
      mockUserId = result.mockUserId;
    }
  });

  afterAll(async () => {
    // Cleanup (best-effort)
    for (const commentId of createdCommentIds) {
      await unauthorizedRequest
        .delete(commentsRoutes.delete(commentId))
        .set(commonHeaders);
    }

    for (const articleId of createdArticleIds) {
      await unauthorizedRequest
        .delete(articlesRoutes.delete(articleId))
        .set(commonHeaders);
    }

    for (const categoryId of createdCategoryIds) {
      await unauthorizedRequest
        .delete(categoriesRoutes.delete(categoryId))
        .set(commonHeaders);
    }

    for (const userId of createdUserIds) {
      await unauthorizedRequest.delete(usersRoutes.delete(userId)).set(commonHeaders);
    }

    // delete mock user (auth mode)
    if (mockUserId) {
      await removeTokenUser(unauthorizedRequest, mockUserId, commonHeaders);
    }

    if (commonHeaders['Authorization']) {
      delete commonHeaders['Authorization'];
    }
  });

  describe('Users', () => {
    it('should paginate GET /user when page/limit provided', async () => {
      const u1 = await unauthorizedRequest
        .post(usersRoutes.create)
        .set(commonHeaders)
        .send({ login: 'PAG_SORT_USER_A', password: 'pw' });
      const u2 = await unauthorizedRequest
        .post(usersRoutes.create)
        .set(commonHeaders)
        .send({ login: 'PAG_SORT_USER_C', password: 'pw' });
      const u3 = await unauthorizedRequest
        .post(usersRoutes.create)
        .set(commonHeaders)
        .send({ login: 'PAG_SORT_USER_B', password: 'pw' });

      expect(u1.status).toBe(StatusCodes.CREATED);
      expect(u2.status).toBe(StatusCodes.CREATED);
      expect(u3.status).toBe(StatusCodes.CREATED);

      createdUserIds.push(u1.body.id, u2.body.id, u3.body.id);

      const response = await unauthorizedRequest
        .get(`${usersRoutes.getAll}?page=1&limit=2`)
        .set(commonHeaders);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 2);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.data.every((u) => !('password' in u))).toBe(true);
    });

    it('should sort GET /user by login asc when sortBy/order provided', async () => {
      const response = await unauthorizedRequest
        .get(`${usersRoutes.getAll}?sortBy=login&order=asc`)
        .set(commonHeaders);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toBeInstanceOf(Array);

      const list = response.body.filter((u) => u.login?.startsWith('PAG_SORT_USER_'));
      const logins = list.map((u) => u.login);

      // Ensure relative order is correct (A before B before C)
      const idxA = logins.indexOf('PAG_SORT_USER_A');
      const idxB = logins.indexOf('PAG_SORT_USER_B');
      const idxC = logins.indexOf('PAG_SORT_USER_C');
      expect(idxA).toBeGreaterThanOrEqual(0);
      expect(idxB).toBeGreaterThanOrEqual(0);
      expect(idxC).toBeGreaterThanOrEqual(0);
      expect(idxA).toBeLessThan(idxB);
      expect(idxB).toBeLessThan(idxC);
    });

    it('should reject invalid sortBy for GET /user', async () => {
      const response = await unauthorizedRequest
        .get(`${usersRoutes.getAll}?sortBy=password&order=asc`)
        .set(commonHeaders);

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Articles + Comments', () => {
    it('should sort GET /article by title asc and paginate when requested', async () => {
      const a1 = await unauthorizedRequest
        .post(articlesRoutes.create)
        .set(commonHeaders)
        .send({ title: 'PAG_SORT_ARTICLE_A', content: 'x' });
      const a2 = await unauthorizedRequest
        .post(articlesRoutes.create)
        .set(commonHeaders)
        .send({ title: 'PAG_SORT_ARTICLE_C', content: 'x' });
      const a3 = await unauthorizedRequest
        .post(articlesRoutes.create)
        .set(commonHeaders)
        .send({ title: 'PAG_SORT_ARTICLE_B', content: 'x' });

      expect(a1.status).toBe(StatusCodes.CREATED);
      expect(a2.status).toBe(StatusCodes.CREATED);
      expect(a3.status).toBe(StatusCodes.CREATED);

      createdArticleIds.push(a1.body.id, a2.body.id, a3.body.id);

      const sortedResponse = await unauthorizedRequest
        .get(`${articlesRoutes.getAll}?sortBy=title&order=asc`)
        .set(commonHeaders);

      expect(sortedResponse.status).toBe(StatusCodes.OK);
      expect(sortedResponse.body).toBeInstanceOf(Array);

      const titles = sortedResponse.body
        .filter((a) => a.title?.startsWith('PAG_SORT_ARTICLE_'))
        .map((a) => a.title);

      const idxA = titles.indexOf('PAG_SORT_ARTICLE_A');
      const idxB = titles.indexOf('PAG_SORT_ARTICLE_B');
      const idxC = titles.indexOf('PAG_SORT_ARTICLE_C');
      expect(idxA).toBeGreaterThanOrEqual(0);
      expect(idxB).toBeGreaterThanOrEqual(0);
      expect(idxC).toBeGreaterThanOrEqual(0);
      expect(idxA).toBeLessThan(idxB);
      expect(idxB).toBeLessThan(idxC);

      const pagedResponse = await unauthorizedRequest
        .get(`${articlesRoutes.getAll}?sortBy=title&order=asc&page=1&limit=2`)
        .set(commonHeaders);

      expect(pagedResponse.status).toBe(StatusCodes.OK);
      expect(pagedResponse.body).toHaveProperty('total');
      expect(pagedResponse.body).toHaveProperty('page', 1);
      expect(pagedResponse.body).toHaveProperty('limit', 2);
      expect(pagedResponse.body).toHaveProperty('data');
      expect(pagedResponse.body.data).toBeInstanceOf(Array);
    });

    it('should sort and paginate comments for an article', async () => {
      const articleResponse = await unauthorizedRequest
        .post(articlesRoutes.create)
        .set(commonHeaders)
        .send({ title: 'PAG_SORT_COMMENTS_ARTICLE', content: 'x' });

      expect(articleResponse.status).toBe(StatusCodes.CREATED);
      const { id: articleId } = articleResponse.body;
      createdArticleIds.push(articleId);

      const c1 = await unauthorizedRequest
        .post(commentsRoutes.create)
        .set(commonHeaders)
        .send({ content: 'PAG_SORT_COMMENT_A', articleId });
      const c2 = await unauthorizedRequest
        .post(commentsRoutes.create)
        .set(commonHeaders)
        .send({ content: 'PAG_SORT_COMMENT_C', articleId });
      const c3 = await unauthorizedRequest
        .post(commentsRoutes.create)
        .set(commonHeaders)
        .send({ content: 'PAG_SORT_COMMENT_B', articleId });

      expect(c1.status).toBe(StatusCodes.CREATED);
      expect(c2.status).toBe(StatusCodes.CREATED);
      expect(c3.status).toBe(StatusCodes.CREATED);

      createdCommentIds.push(c1.body.id, c2.body.id, c3.body.id);

      const sortedResponse = await unauthorizedRequest
        .get(`/comment?articleId=${articleId}&sortBy=content&order=asc`)
        .set(commonHeaders);

      expect(sortedResponse.status).toBe(StatusCodes.OK);
      expect(sortedResponse.body).toBeInstanceOf(Array);

      const contents = sortedResponse.body
        .filter((c) => c.content?.startsWith('PAG_SORT_COMMENT_'))
        .map((c) => c.content);

      const idxA = contents.indexOf('PAG_SORT_COMMENT_A');
      const idxB = contents.indexOf('PAG_SORT_COMMENT_B');
      const idxC = contents.indexOf('PAG_SORT_COMMENT_C');
      expect(idxA).toBeGreaterThanOrEqual(0);
      expect(idxB).toBeGreaterThanOrEqual(0);
      expect(idxC).toBeGreaterThanOrEqual(0);
      expect(idxA).toBeLessThan(idxB);
      expect(idxB).toBeLessThan(idxC);

      const pagedResponse = await unauthorizedRequest
        .get(`/comment?articleId=${articleId}&page=1&limit=2`)
        .set(commonHeaders);

      expect(pagedResponse.status).toBe(StatusCodes.OK);
      expect(pagedResponse.body).toHaveProperty('total');
      expect(pagedResponse.body).toHaveProperty('page', 1);
      expect(pagedResponse.body).toHaveProperty('limit', 2);
      expect(pagedResponse.body).toHaveProperty('data');
      expect(pagedResponse.body.data).toBeInstanceOf(Array);
    });

    it('sanity: created ids should be valid uuids', () => {
      for (const id of [...createdUserIds, ...createdArticleIds, ...createdCommentIds, ...createdCategoryIds]) {
        expect(validate(id)).toBe(true);
      }
    });
  });
});

