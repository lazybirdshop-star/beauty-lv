# syntax=docker/dockerfile:1

# Сборка API из монорепозитория. Контекст сборки — корень репозитория, а не
# `apps/api`: пакет зависит от `@amolie/shared-kernel` по workspace-ссылке, и
# без корневого lock-файла установка была бы не воспроизводимой.
#
# Debian, а не Alpine: `argon2` — нативный модуль, и под musl он собирается из
# исходников вместо готовой сборки. Экономия сотни мегабайт образа не стоит
# сборочной цепочки в рантайме.

FROM node:26-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Corepack больше не входит в дистрибутив Node (выпилен из ветки 25+), поэтому
# pnpm ставится явно. Версия обязана совпадать с полем `packageManager` в
# корневом package.json — иначе lock-файл и установка разъедутся.
ARG PNPM_VERSION=11.18.0
RUN npm install --global pnpm@${PNPM_VERSION}

WORKDIR /app

# ── Сборка ────────────────────────────────────────────────────────────────
FROM base AS build

# Сначала манифесты: слой с зависимостями переживает правку кода и не
# переустанавливается на каждый коммит.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared-kernel/package.json packages/shared-kernel/
RUN pnpm install --frozen-lockfile

COPY packages/shared-kernel packages/shared-kernel
COPY apps/api apps/api
COPY tsconfig.base.json ./

RUN pnpm --filter @amolie/shared-kernel build
RUN pnpm --filter @amolie/api build

# ── Рантайм ───────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared-kernel/package.json packages/shared-kernel/
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared-kernel/dist packages/shared-kernel/dist
COPY --from=build /app/apps/api/dist apps/api/dist

# Миграции едут в образе: выкатка применяет их до старта нового кода
# (DEPLOYMENT.md §3.3) командой `node dist/database/migrate.js`.
COPY apps/api/drizzle apps/api/drizzle

WORKDIR /app/apps/api

# Приложение слушает `PORT`; у хостингов он приходит переменной окружения.
EXPOSE 3001
CMD ["node", "dist/main.js"]
