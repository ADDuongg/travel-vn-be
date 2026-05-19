FROM node:20-alpine AS builder

WORKDIR /app

ENV YARN_CACHE_FOLDER=/root/.cache/yarn

COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --frozen-lockfile

COPY . .
RUN yarn build

RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --frozen-lockfile --production

FROM node:20-alpine AS runner

WORKDIR /app

ARG APP_VERSION=
ENV APP_VERSION=${APP_VERSION}

ENV NODE_ENV=production

RUN apk add --no-cache wget

COPY package.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 9001

HEALTHCHECK --interval=15s --timeout=8s --start-period=180s --retries=5 \
  CMD wget -q -O /dev/null --timeout=5 http://127.0.0.1:9001/health || exit 1

CMD ["node", "dist/src/main.js"]
