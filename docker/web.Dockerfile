# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Developer Playground — Web (Next.js App Router) image
# Multi-stage, pnpm-workspace aware — the whole monorepo is copied so pnpm can
# resolve the workspace graph (apps/web depends on packages/*).
# ---------------------------------------------------------------------------

##############################
# Stage 1 — builder
##############################
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

WORKDIR /app

# NEXT_PUBLIC_* values are inlined at build time, so they must be present here.
ARG NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY . .

RUN pnpm install --frozen-lockfile

# Shared packages may be imported by the web app; build them alongside it.
RUN pnpm --filter @developer-playground/web... build

##############################
# Stage 2 — runner
##############################
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app .

# Next.js dev/start listens on 3000.
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "--filter", "@developer-playground/web", "start"]
