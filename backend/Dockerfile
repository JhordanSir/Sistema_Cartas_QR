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
COPY backend/prisma ./backend/prisma
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json

RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY . .

RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm db:generate \
    && pnpm --filter @sirio/shared build \
    && pnpm --filter @sirio/api build

FROM base AS runner

ENV NODE_ENV=production
ENV API_PORT=3001
ENV STORAGE_PATH=/app/storage

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /app/backend/prisma.config.ts ./backend/prisma.config.ts
COPY --from=build --chown=node:node /app/backend/prisma ./backend/prisma
COPY --from=build --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/shared/package.json ./shared/package.json
COPY --from=build --chown=node:node /app/shared/dist ./shared/dist

RUN mkdir -p "${STORAGE_PATH}" \
    && chown -R node:node "${STORAGE_PATH}"

USER node

# prisma.config.ts is looked up in the working directory, and the API resolves
# the workspace root (/app) from the backend package as in local development.
WORKDIR /app/backend

EXPOSE 3001

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/bootstrap/seed-initial-admin.js && exec node dist/main.js"]
