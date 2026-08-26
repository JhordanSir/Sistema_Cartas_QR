FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.1.1

WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY . .

RUN pnpm db:generate \
    && pnpm --filter ./apps/api... build

FROM base AS runner

ENV NODE_ENV=production
ENV API_PORT=3001
ENV STORAGE_PATH=/app/storage

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist

RUN mkdir -p "${STORAGE_PATH}" \
    && chown -R node:node "${STORAGE_PATH}"

USER node

EXPOSE 3001

CMD ["sh", "-c", "pnpm db:deploy && exec node apps/api/dist/main.js"]
