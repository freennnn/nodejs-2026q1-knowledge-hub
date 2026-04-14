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

To run all test with authorization

```
npm run test:auth
```

To run only specific test suite with authorization

```
npm run test:auth -- <path to suite>
```

To run refresh token tests

```
npm run test:refresh
```

To run RBAC (role-based access control) tests

```
npm run test:rbac
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
