# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Developer Playground — Worker (BullMQ) image
# No HTTP port. Connects to Redis (queues) and Postgres (delivery logs).
# Multi-stage, pnpm-workspace aware — the whole monorepo is copied so pnpm can
# resolve the workspace graph (apps/worker depends on packages/*).
# ---------------------------------------------------------------------------

##############################
# Stage 1 — builder
##############################
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# The worker uses the Prisma client to record delivery attempts.
RUN pnpm --filter @developer-playground/database generate

# Build the worker and everything it depends on.
RUN pnpm --filter @developer-playground/worker... build

##############################
# Stage 2 — runner
##############################
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app .

# No EXPOSE — the worker has no inbound HTTP surface.
CMD ["pnpm", "--filter", "@developer-playground/worker", "start:prod"]
