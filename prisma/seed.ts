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

  const tagNames = [
    'cityhall',
    'subway',
    'housing',
    'elections',
    'broadway',
    'transit',
    'budget',
    'schools',
    'public-safety',
    'small-business',
    'parks',
    'health',
  ];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.create({
        data: { name },
      }),
    ),
  );
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));

  const metroTopics = [
    'Subway reliability report',
    'Neighborhood compost rollout',
    'Bus lane enforcement update',
    'Emergency response drill',
    'Weekend street fair logistics',
  ];
  const politicsTopics = [
    'City budget hearing',
    'Council oversight session',
    'School funding debate',
    'Mayoral policy briefing',
    'Housing committee vote',
  ];
  const cultureTopics = [
    'Broadway preview',
    'Museum late-night program',
    'Public library author series',
    'Borough arts residency',
    'Film festival lineup',
  ];

  const allTopics = [...metroTopics, ...politicsTopics, ...cultureTopics];
  const statuses: ArticleStatus[] = [
    ...Array.from({ length: 36 }, () => ArticleStatus.PUBLISHED),
    ...Array.from({ length: 8 }, () => ArticleStatus.DRAFT),
    ...Array.from({ length: 6 }, () => ArticleStatus.ARCHIVED),
  ];

  const articleSeeds = Array.from({ length: 50 }, (_, i) => {
    const category = categories[i % categories.length];
    const topic = allTopics[i % allTopics.length];
    const district = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'][i % 5];
    const title = `${topic} Draws Focus in ${district}`;
    const content = [
      `City officials released a detailed update on ${topic.toLowerCase()} with a focus on ${district}.`,
      'The briefing included timelines, staffing plans, and a breakdown of expected neighborhood impact over the next quarter.',
      'Residents and local organizations raised practical concerns about implementation costs, communication gaps, and weekend service continuity.',
      'Agency leaders said they will publish weekly progress notes and adjust milestones based on ridership and community feedback data.',
    ].join(' ');

    const status = statuses[i];
    const authorId = i % 2 === 0 ? admin.id : editor.id;

    const tagTriples = [
      ['cityhall', 'budget', 'public-safety'],
      ['subway', 'transit', 'small-business'],
      ['housing', 'schools', 'parks'],
      ['elections', 'cityhall', 'health'],
      ['broadway', 'small-business', 'parks'],
    ] as const;
    const selectedTags = tagTriples[i % tagTriples.length];

    return {
      title,
      content,
      status,
      authorId,
      categoryId: category.id,
      tags: selectedTags.map((name) => ({ id: tagsByName.get(name)!.id })),
    };
  });

  const articles = await Promise.all(
    articleSeeds.map((seed) =>
      prisma.article.create({
        data: {
          title: seed.title,
          content: seed.content,
          status: seed.status,
          authorId: seed.authorId,
          categoryId: seed.categoryId,
          tags: {
            connect: seed.tags,
          },
        },
      }),
    ),
  );

  await Promise.all(
    articles.slice(0, 12).map((article, i) =>
      prisma.comment.create({
        data: {
          content: `Reader note ${i + 1}: useful context with clear local implications.`,
          articleId: article.id,
          authorId: i % 2 === 0 ? editor.id : admin.id,
        },
      }),
    ),
  );
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
