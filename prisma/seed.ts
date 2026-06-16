import { PrismaClient, ArticleStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const editorPassword = await bcrypt.hash('editor123', 10);

  // Clear child records first to satisfy FK constraints.
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const [admin, editor] = await Promise.all([
    prisma.user.create({
      data: {
        login: 'ny_news_admin',
        password: adminPassword,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        login: 'ny_news_editor',
        password: editorPassword,
        role: UserRole.EDITOR,
      },
    }),
  ]);

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Metro',
        description: 'Local New York city and borough coverage',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Politics',
        description: 'City and state politics and public policy',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Culture',
        description: 'Arts, books, and cultural life in New York',
      },
    }),
  ]);

  const tagNames = ['cityhall', 'subway', 'housing', 'elections', 'broadway'];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.create({
        data: { name },
      }),
    ),
  );
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));

  const articles = await Promise.all([
    prisma.article.create({
      data: {
        title: 'City Hall Announces New Subway Safety Plan',
        content: 'Officials outlined a week-by-week rollout across major stations.',
        status: ArticleStatus.PUBLISHED,
        authorId: admin.id,
        categoryId: categories[0].id,
        tags: {
          connect: [{ id: tagsByName.get('cityhall')!.id }, { id: tagsByName.get('subway')!.id }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Mayoral Race Tightens Ahead of Final Debate',
        content: 'Latest polling suggests a narrow margin among leading candidates.',
        status: ArticleStatus.DRAFT,
        authorId: editor.id,
        categoryId: categories[1].id,
        tags: {
          connect: [
            { id: tagsByName.get('elections')!.id },
            { id: tagsByName.get('cityhall')!.id },
          ],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Broadway Season Opens With Record Advance Sales',
        content: 'Producers report a strong box office outlook for the quarter.',
        status: ArticleStatus.PUBLISHED,
        authorId: admin.id,
        categoryId: categories[2].id,
        tags: {
          connect: [{ id: tagsByName.get('broadway')!.id }, { id: tagsByName.get('housing')!.id }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Rent Stabilization Hearing Draws Packed Crowd',
        content: 'Tenants and landlords testified for hours at a public forum.',
        status: ArticleStatus.ARCHIVED,
        authorId: editor.id,
        categoryId: categories[1].id,
        tags: {
          connect: [{ id: tagsByName.get('housing')!.id }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Weekend Guide: Five Exhibits Worth Your Time',
        content: 'A curated shortlist of new shows across Manhattan and Brooklyn.',
        status: ArticleStatus.DRAFT,
        authorId: admin.id,
        categoryId: categories[0].id,
        tags: {
          connect: [{ id: tagsByName.get('broadway')!.id }, { id: tagsByName.get('subway')!.id }],
        },
      },
    }),
  ]);

  await Promise.all([
    prisma.comment.create({
      data: {
        content: 'Good reporting and clear sourcing.',
        articleId: articles[0].id,
        authorId: editor.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Would like to see neighborhood-level turnout numbers.',
        articleId: articles[1].id,
        authorId: admin.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Great roundup, especially the Queens picks.',
        articleId: articles[2].id,
        authorId: editor.id,
      },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
