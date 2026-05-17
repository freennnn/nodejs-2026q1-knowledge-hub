# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

## Downloading

```
git clone {repository URL}
```

## Installing NPM modules

```
npm install
```

## Running application

```
npm start
```

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

## Running with Docker

1. Copy environment template:

```
cp .env.example .env
```

Set image names once in `.env`:

- `IMAGE_LOCAL_NAME` - local image tag for build/compose/scan (example: `knowledge-hub:local`)
- `IMAGE_HUB_NAME` - Docker Hub tag for push (example: `freennnn/knowledge-hub:latest`)

2. Start from a clean local database when needed:

```
docker compose down -v
```

This removes Compose containers and the PostgreSQL volume. Images are separate from volumes and are not removed by this command.

3. Build and run application + PostgreSQL:

```
docker compose up --build
```

This builds the local app image from the current source code, starts PostgreSQL, applies committed Prisma migrations with the `migrate` service, and then starts the app container.

4. Optional seed data:

Run this after `docker compose up --build` has applied migrations successfully. The seed script replaces demo data, so it is not run automatically on every app startup.

```
docker compose --profile seed run --rm seed
```

5. Optional Adminer UI (debug profile):

```
docker compose --profile debug up --build
```

- API: http://localhost:4000
- Swagger: http://localhost:4000/doc
- Adminer: http://localhost:8080 (debug profile only)

## Local App with Docker DB

The DB container is the running PostgreSQL server process. The DB volume is where PostgreSQL stores data. The app needs the container to be running, and the container needs the volume to keep data between restarts.

If you already ran the full Docker flow above, the DB is migrated and ready. To switch from the Docker app container to a local Nest process:

```
docker compose stop app
npm run start:dev
```

Keep local `.env` pointed at `localhost`, because the local Node process connects through Docker's published port:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public
```

You can also start only the DB container for local development:

```
docker compose up -d db
npm run prisma:generate
npm run prisma:migrate:deploy
npm run start:dev
```

With this DB-only flow, Prisma generation and migrations are manual because the Compose `migrate` service only runs during the full Compose app flow.

### Updated local flow (app local, DB + Qdrant in Docker)

1. Start infra:

```bash
docker compose up -d db vectordb
```

2. Prepare DB (same as before):

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

Optional:

```bash
npm run prisma:seed
```

3. Start app locally:

```bash
npm run start:dev
```

4. Build vector index (new):

- get token
- call `POST /ai/rag/index` (for example with `{"onlyPublished": false}`)

After that, `/ai/rag/search` and `/ai/rag/chat` are meaningful.

## RAG + Vector DB

### Models used

- Embedding model: `GEMINI_EMBEDDING_MODEL=text-embedding-004`

### Vector DB used

- Provider: **Qdrant** (`qdrant/qdrant` image)
- Service in Compose: `vectordb`
- Ports: `6333` (REST), `6334` (gRPC)
- Persistent volume: `qdrant_data`
- The app container connects internally via `http://vectordb:6333` (Compose env override).
- Qdrant gets data when you call `POST /ai/rag/index` (bulk index build/refresh), and also from article CRUD flows (`POST /article`, `PATCH /article/:id`, `DELETE /article/:id`) which sync/remove vectors for affected articles.

### Full startup flow after clone

1. Copy env template:

```bash
cp .env.example .env
```

2. Set a valid `GEMINI_API_KEY` in `.env`.

3. Start full stack (app + PostgreSQL + Qdrant + migrate):

```bash
docker compose up --build
```

4. (Optional) seed demo data:

```bash
docker compose --profile seed run --rm seed
```

5. Get access token (seeded admin):

```bash
ACCESS_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"ny_news_admin","password":"admin123"}' | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).accessToken")
```

6. Build/refresh vector index:

```bash
curl -s -X POST http://localhost:4000/ai/rag/index \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"onlyPublished":false}'
```

7. Semantic search request:

```bash
curl -s -X POST http://localhost:4000/ai/rag/search \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"How are DTOs validated?","limit":5}'
```

8. RAG chat request:

```bash
curl -s -X POST http://localhost:4000/ai/rag/chat \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Summarize how this API validates input"}'
```

9. Optional conversation history inspection:

```bash
curl -s http://localhost:4000/ai/rag/chat/<conversationId>/history \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### RAG known limitations

- Gemini free-tier quotas can cause temporary rate limiting/overload responses.
- Latency varies by region and current provider load.
- Initial indexing time grows with article count and chunk count.
- Regional availability of Gemini models/features can vary by account/location.
- RAG conversation memory is in-memory only (cleared on service restart).

### Hybrid retrieval for `/ai/rag/search/hybrid`

`/ai/rag/search/hybrid` uses a hybrid approach to improve recall and robustness.
`/ai/rag/search` pure semantic vector search.

1. Compute query embedding via Gemini.
2. Run vector search in Qdrant for semantic candidates (expanded pool, not just final `limit`).
3. Run PostgreSQL lexical retrieval using full-text search over `Article.title + Article.content`:
   - `to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))`
   - `@@ plainto_tsquery('english', :query)`
   - ordered by `ts_rank_cd(...) DESC`.
4. Take lexical candidate `articleId`s and run an extra vector search constrained to those ids.
5. Merge both candidate lists using Reciprocal Rank Fusion (RRF), then return top `limit`.

Applied filters (`articleStatus`, `categoryId`, `tags`) are respected in both lexical and vector phases.

RRF formula used for each candidate:

`RRF score = 1 / (k + semanticRank) + 1 / (k + lexicalRank)`

Current constants in code:

- `k = 60` (RRF damping).
- candidate expansion factor: `4x` requested limit.
- max candidate cap per phase: `40`.

Why this helps:

- semantic retrieval captures paraphrases/similar meaning;
- lexical retrieval captures exact term intent and rare keywords;
- fusion reduces failure cases where one signal alone misses relevant chunks.

## Reviewer Quickstart (AI endpoints)

Use this section to run the app end-to-end and try all AI routes quickly.

Gemini API key setup (step-by-step):

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Open **Get API key**.
4. Create a new API key (or reuse an existing one).
5. Copy the key value.
6. Paste it into your local `.env` as `GEMINI_API_KEY=...`.

Gemini model used by this service:

- `GEMINI_MODEL` (default in project: `gemini-2.5-flash`)

1. Copy env and set Gemini key:

```
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` to a valid key.

2. Install and start app:

```
npm install
docker compose down -v
docker compose up -d db
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

3. In a second terminal, get access token from seeded admin user:

```
ACCESS_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"ny_news_admin","password":"admin123"}' | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).accessToken")
```

4. Get one seeded article id:

```
ARTICLE_ID=$(curl -s http://localhost:4000/article \
  -H "Authorization: Bearer $ACCESS_TOKEN" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8'))[0].id")
echo "$ARTICLE_ID"
```

5. Run all four AI requests:

Translate:

```
curl -s -X POST "http://localhost:4000/ai/articles/$ARTICLE_ID/translate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage":"belarussian"}'
```

```
{"articleId":"2dbdd67f-a2d0-42a8-bcb8-b34378453dfc","translatedText":"Падабраны кароткі спіс новых шоу па ўсім Манхэтэне і Брукліне.","detectedLanguage":"en","cacheHit":false,"tokenUsage":{"prompt":71,"candidates":49,"total":120}}%
```

Summarize:

```
curl -s -X POST "http://localhost:4000/ai/articles/$ARTICLE_ID/summarize" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxLength":"short","style":"witty"}'
```

```
{"articleId":"2dbdd67f-a2d0-42a8-bcb8-b34378453dfc","summary":"This article, rather amusingly, is *the summary itself*: a self-declared, curated shortlist of new shows hitting Manhattan and Brooklyn. It's less about the actual shows and more a wonderfully concise promise of cultural delights to come. Consider it the world's most efficient, yet utterly opaque, guide to upcoming entertainment – a high-concept table of contents, if you will, sans actual contents. Ta-da!","originalLength":63,"summaryLength":408,"cacheHit":false,"tokenUsage":{"prompt":101,"candidates":90,"total":191}}%
```

Analyze:

```
curl -s -X POST "http://localhost:4000/ai/articles/$ARTICLE_ID/analyze" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"task":"review"}'
```

```
{"articleId":"2dbdd67f-a2d0-42a8-bcb8-b34378453dfc","analysis":"The provided content is exceptionally clear, concise, and grammatically correct. It effectively functions as a compelling headline or a brief introductory blurb, precisely communicating the subject matter (new shows), the selection process (curated shortlist), and the geographical scope (Manhattan and Brooklyn). Its structure is appropriate for a short, descriptive piece, and it contains no errors in spelling or grammar.","suggestions":[],"severity":"info","cacheHit":false,"tokenUsage":{"prompt":124,"candidates":87,"total":211}}%
```

Generic prompt:

```
curl -s -X POST "http://localhost:4000/ai/generate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"List 3 concise facts about Warsaw in JSON."}'
```

```
{"text":"Warsaw is the capital and largest city of Poland. It was almost completely destroyed during World War II but meticulously rebuilt, including its historic Old Town, which is a UNESCO World Heritage Site. The city is also a major economic and cultural hub in Central Europe.","cacheHit":false,"tokenUsage":{"prompt":71,"candidates":56,"total":127}}%
```

Generic prompt with conversation context (same `sessionId` on follow-up):

```
curl -s -X POST "http://localhost:4000/ai/generate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"List 3 concise facts about Brest in JSON."}'
```

```
{"text":"Brest is a major French military port city in Brittany. It was largely destroyed during WWII and extensively rebuilt. The city is also home to Océanopolis, a prominent ocean discovery center.","cacheHit":false,"tokenUsage":{"prompt":71,"candidates":43,"total":114},"sessionId":"640d47db-5714-454b-b178-d66f384c1135"}%
```

Successful follow-up response example with same `sessionId`:

```
curl -s -X POST "http://localhost:4000/ai/generate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"List 2 more facts about Brest in JSON.", "sessionId":"640d47db-5714-454b-b178-d66f384c1135"}'
```

```
{"text":"Brest is home to the University of Western Brittany (UBO). The Pont de Recouvrance in Brest is one of the largest vertical-lift bridges in Europe.","cacheHit":false,"tokenUsage":{"prompt":144,"candidates":39,"total":183},"sessionId":"640d47db-5714-454b-b178-d66f384c1135"}%
```

Optional usage stats (admin only):

```
curl -s http://localhost:4000/ai/usage \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

```
{"totalRequests":19,"byEndpoint":{"translate_article":4,"summarize_article":5,"analyze_article":8,"generic_prompt":2},"tokenTotals":{"prompt":367,"candidates":282,"total":649}}%
```

## Known limitations

- In-memory AI cache is reset on server restart.
- In-memory conversation sessions for `/ai/generate` are reset on server restart.
- Conversation context is short-term by design and keeps only the last 3 turns per session.
- Gemini free tier can return temporary upstream overload errors (for example high-demand responses) and latency can vary by region/load.

Run tests in another terminal after the DB is migrated:

```
npm run test
npm run test:extra
```

### Image security scan

Build and tag image:

```
npm run docker:build:image
```

Run vulnerability scan (choose one):

```
npm run docker:scan:scout
```

```
npm run docker:scan:trivy
```

Include scan results summary (or note about no critical vulnerabilities) in PR description.

### Docker Hub image

Push your image and add a link to it in this README:

```
docker login
npm run docker:push:image
```

Set both image variables in `.env`, for example:

```
IMAGE_LOCAL_NAME=knowledge-hub:local
IMAGE_HUB_NAME=freennnn/knowledge-hub:latest
```

Docker Hub repository:

- https://hub.docker.com/r/freennnn/knowledge-hub

## Testing

After application running open new terminal and enter:

To run all tests without authorization

```
npm run test
```

To run only one of all test suites

```
npm run test -- <path to suite>
```

### Auto-fix and format

```
npm run lint
```

```
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
