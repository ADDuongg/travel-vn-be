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

# Chi copy file lien quan den dependencies truoc (Docker layer cache strategy)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy toan bo source code va build
COPY . .
RUN yarn build


# -----------------------------------------------------------------------------
# Stage 2: RUNNER -- Production image (chi co production deps + dist/)
# -----------------------------------------------------------------------------
# Muc dich: Image cuoi cung chi chua production dependencies + compiled JS.
# Khong co devDependencies, khong co TypeScript source, khong co test files.
# Image size nho hon, bao mat hon (attack surface nho).
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# wget: dung cho HEALTHCHECK va docker-compose healthcheck (image alpine mac dinh khong co)
RUN apk add --no-cache wget

# Chi cai production dependencies (khong co devDeps)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy compiled JS tu builder stage
COPY --from=builder /app/dist ./dist

# NestJS API listen port 9001 ben trong container.
# Tren host: staging 127.0.0.1:3001, production 127.0.0.1:3002 (xem docker-compose).
EXPOSE 9001

# HEALTHCHECK (compose file may override). Nest can take >60s to listen on slow VPS.
HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9001/health || exit 1

# Chay NestJS app
CMD ["node", "dist/src/main.js"]
