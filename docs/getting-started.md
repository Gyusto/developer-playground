# Getting started (local development)

This guide gets Developer Playground running on your machine for development, with the
three apps in watch mode and Postgres + Redis in Docker.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | Matches `engines` in the root `package.json`. |
| pnpm | 9.12.0 | Pinned via `packageManager`. Easiest: `corepack enable`. |
| Docker + Compose | recent | For Postgres, Redis, and full-stack runs. |

Enable the pinned pnpm without installing it globally:

```bash
corepack enable
```

## 1. Install dependencies

From the repo root:

```bash
pnpm install
```

This installs every workspace package (`apps/*`, `packages/*`) with a single
lockfile.

## 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` already point at the Dockerized Postgres/Redis on
`localhost`. Review these before anything else:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. |
| `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT` | Redis connection. |
| `API_PORT` | API listen port (default `4000`). |
| `PORTAL_JWT_SECRET` | Portal JWT signing secret — **change it**. |
| `CREDENTIAL_ENCRYPTION_KEY` | 32-byte hex AES-256-GCM key for secrets at rest — **change it**. |
| `WEBHOOK_ALLOWED_PRIVATE_CIDRS` | SSRF allowlist; empty blocks private ranges. |
| `NEXT_PUBLIC_API_BASE_URL` | Where the web app calls the API. |

## 3. Start Postgres + Redis

Bring up just the infrastructure services (leave the apps to run on the host):

```bash
docker compose up -d postgres redis
# or:
make infra
```

Both have healthchecks; give them a few seconds to report healthy
(`docker compose ps`).

## 4. Migrate and seed the database

```bash
pnpm --filter @developer-playground/database migrate   # create/apply dev migrations
pnpm db:seed                               # load demo data
# or, via Make:
make migrate-dev
make seed
```

`prisma generate` runs automatically as part of migrate, but you can run it
explicitly with `pnpm db:generate` if you change the schema.

## 5. Run the apps

Run all three in watch mode from the root:

```bash
pnpm dev        # api + worker + web in parallel
# or:
make dev
```

Or run them individually in separate terminals:

```bash
pnpm --filter @developer-playground/api dev       # NestJS  -> http://localhost:4000
pnpm --filter @developer-playground/worker dev    # BullMQ worker (no port)
pnpm --filter @developer-playground/web dev       # Next.js -> http://localhost:3000
```

## 6. Verify

| What | URL |
|---|---|
| Portal UI | http://localhost:3000 |
| API base | http://localhost:4000/api/v1 |
| Swagger / OpenAPI | http://localhost:4000/api/docs |
| Runtime example | `POST http://localhost:4000/api/runtime/{workspace}/{system}/{env}/{path}` |

## Common tasks

```bash
pnpm lint            # lint all packages
pnpm build           # build/typecheck all packages
pnpm test            # unit tests across the workspace
make reset           # drop + recreate + reseed the dev DB (destructive)
```

## Prefer the full stack in Docker?

To run everything (including api/worker/web/nginx) in containers instead of on
the host, see [deployment.md](./deployment.md) — `make up` builds and starts the
whole stack behind nginx on http://localhost.

## Troubleshooting

- **Prisma "did not initialize" / missing client** — run `pnpm db:generate`.
- **DB connection refused** — ensure `docker compose ps` shows `postgres`
  healthy and `DATABASE_URL` host is `localhost` for host-run apps.
- **Port already in use** — change `API_PORT` in `.env` (API) or run Next on a
  different port with `pnpm --filter @developer-playground/web dev -- -p 3001`.
