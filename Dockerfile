# =============================================================================
# DOCKERFILE -- Multi-stage build cho NestJS API
# =============================================================================
#
# Dockerfile nay dung chung cho ca staging va production.
# Env vars duoc truyen tai RUNTIME qua docker-compose env_file (khong phai build-time).
#
# Gom 2 stage:
#   1. builder -- Install deps + build TypeScript ra dist/
#   2. runner  -- Chi chua production deps + dist/ (image nhe, khong co devDeps)
#
# Cach build:
#   docker build -t backend:latest .
#
# =============================================================================


# -----------------------------------------------------------------------------
# Stage 1: BUILDER -- Install dependencies + build TypeScript
# -----------------------------------------------------------------------------
# Muc dich: Cai tat ca deps (bao gom devDeps) de compile TypeScript.
# Output: /app/dist/ chua compiled JS files.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Yarn cache (BuildKit mount — persisted across CI docker builds, not in final image)
ENV YARN_CACHE_FOLDER=/root/.cache/yarn

# Chi copy file lien quan den dependencies truoc (Docker layer cache strategy)
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --frozen-lockfile

# Copy toan bo source code va build
COPY . .
RUN yarn build

# Prune devDependencies (reuses YARN_CACHE_FOLDER mount; runner copies node_modules)
RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --frozen-lockfile --production


# -----------------------------------------------------------------------------
# Stage 2: RUNNER -- Production image (chi co production deps + dist/)
# -----------------------------------------------------------------------------
# Muc dich: Image cuoi cung chi chua production dependencies + compiled JS.
# Khong co devDependencies, khong co TypeScript source, khong co test files.
# Image size nho hon, bao mat hon (attack surface nho).
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# GitLab CI: docker build --build-arg APP_VERSION=$CI_COMMIT_SHORT_SHA (logs / Loki)
ARG APP_VERSION=
ENV APP_VERSION=${APP_VERSION}

ENV NODE_ENV=production

# wget: dung cho HEALTHCHECK va docker-compose healthcheck (image alpine mac dinh khong co)
RUN apk add --no-cache wget

# Production node_modules da prune o builder; chi copy, khong yarn install lai
COPY package.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# NestJS API listen port 9001 ben trong container.
# Tren host: staging 127.0.0.1:3001, production 127.0.0.1:3002 (xem docker-compose).
EXPOSE 9001

# HEALTHCHECK (compose file may override). GET /health — not --spider (HEAD).
HEALTHCHECK --interval=15s --timeout=8s --start-period=180s --retries=5 \
  CMD wget -q -O /dev/null --timeout=5 http://127.0.0.1:9001/health || exit 1

# One-off ES backfill (tours): docker exec -it backend-production yarn run search:reindex-tours
# Can require: cwd /app, env same as API (compose env_file / ELASTICSEARCH_* + DB_URI).

# Chay NestJS app
CMD ["node", "dist/src/main.js"]
