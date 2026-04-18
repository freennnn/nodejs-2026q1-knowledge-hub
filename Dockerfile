FROM node:24-alpine AS build

WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public

COPY package.json package-lock.json ./

# bcrypt may require native build tooling on Alpine (musl)
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci \
  && apk del .build-deps

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src
COPY doc ./doc

RUN npx prisma generate && npm run build

FROM node:24-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# curl is used by Compose healthcheck; build deps are temporary for native addons
RUN apk add --no-cache curl

COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev \
  && npm cache clean --force \
  && apk del .build-deps
# copy from /app folder of build stage (completely different) to /app of prod stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/doc ./doc
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

RUN chown -R node:node /app
USER node

EXPOSE 4000

CMD ["node", "dist/main"]
