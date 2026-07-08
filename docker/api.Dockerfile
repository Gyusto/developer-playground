# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Developer Playground — API (NestJS) image
# Multi-stage, pnpm-workspace aware. The whole monorepo is copied so pnpm can
# resolve the workspace graph (apps/api depends on packages/*).
# ---------------------------------------------------------------------------

##############################
# Stage 1 — builder
##############################
FROM node:20-alpine AS builder

# Prisma engines + common native deps need these on Alpine.
RUN apk add --no-cache libc6-compat openssl

# Enable pnpm through corepack (version is pinned in the root package.json).
RUN corepack enable

WORKDIR /app

# Copy the entire monorepo so the workspace graph resolves correctly.
# (Root .dockerignore keeps node_modules / build artifacts out of the context.)
COPY . .

# Install every workspace dependency from the committed lockfile.
RUN pnpm install --frozen-lockfile

# Generate the Prisma client that the API imports at runtime.
RUN pnpm --filter @developer-playground/database generate

# Build the API and everything it depends on (shared packages).
RUN pnpm --filter @developer-playground/api... build

##############################
# Stage 2 — runner
##############################
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

# Copy the fully installed + built monorepo from the builder. This includes the
# generated Prisma client, the pnpm workspace symlinks, and the Prisma CLI
# (used by docker-compose to run `migrate deploy` before the app boots).
COPY --from=builder /app .

# API listens on API_PORT (default 4000); compose/.env can override.
ENV API_PORT=4000
EXPOSE 4000

# The image only runs the app; migrations are orchestrated from docker-compose.
CMD ["pnpm", "--filter", "@developer-playground/api", "start:prod"]
