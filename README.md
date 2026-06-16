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
npx prisma migrate deploy
npm run start:dev
```

With this DB-only flow, Prisma generation and migrations are manual because the Compose `migrate` service only runs during the full Compose app flow.

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
