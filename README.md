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

2. Build and run application + PostgreSQL:

```
docker compose up --build
```

3. Optional Adminer UI (debug profile):

```
docker compose --profile debug up --build
```

- API: http://localhost:4000
- Swagger: http://localhost:4000/doc
- Adminer: http://localhost:8080 (debug profile only)

## Prisma Database Workflow

Typical dev flow (your setup):

1. Start DB container:

```
docker compose up -d db
```

2. Ensure local `DATABASE_URL` uses `localhost:5432`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public
```

3. Run in repo:

```
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Start app:

```
npm run start:dev
```

If app runs inside Compose, then `DATABASE_URL` should use host `db` instead of `localhost`:

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/knowledge_hub?schema=public
```

For production-like deployment, apply committed migrations with:

```
npx prisma migrate deploy
```

## Local Run + Tests (Quick Flow)

1. Start PostgreSQL:

```
docker compose up -d db
```

2. Start app:

```
npm run start:dev
```

3. Run tests in another terminal:

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
