# Deployment

Developer Playground ships as four containers behind one Nginx reverse proxy, orchestrated
by the root `docker-compose.yml`. Nginx is the only published service.

## Topology

```text
              :80
   Internet ─────► nginx ──► /api/ ─► api      (:4000)
                        └──► /     ─► web      (:3000)
                                       api ─┬─► postgres (:5432)
                                            └─► redis    (:6379)
                             worker ────────┴─► postgres + redis
```

| Service | Image / build | Published | Notes |
|---|---|---|---|
| `nginx` | `nginx:1.27-alpine` | `80` | Public entrypoint, `docker/nginx.conf`. |
| `web` | `docker/web.Dockerfile` | internal `3000` | Next.js portal. |
| `api` | `docker/api.Dockerfile` | internal `4000` | NestJS; runs migrations on boot. |
| `worker` | `docker/worker.Dockerfile` | — | BullMQ; no HTTP surface. |
| `postgres` | `postgres:16-alpine` | `5432`* | Volume `pgdata`. |
| `redis` | `redis:7-alpine` | `6379`* | Volume `redisdata` (AOF on). |

\* Postgres/Redis ports are published for local convenience — **unpublish them
in a hardened production deployment** (remove the `ports:` entries) so only
nginx is reachable.

## Quick start

```bash
cp .env.example .env      # then edit secrets — see below
make up                   # docker compose up -d --build
make logs                 # follow logs
make down                 # stop (keeps data)
make clean                # stop + delete volumes (DESTRUCTIVE)
```

`make up` builds all images and starts the stack. The `api` service runs
`prisma migrate deploy` automatically before booting (idempotent). Once healthy,
the portal is at **http://localhost** and the API under **http://localhost/api**.

## Build strategy

All three app Dockerfiles are **multi-stage and pnpm-workspace aware**. The
build context is the whole monorepo (the root `.dockerignore` trims
`node_modules`/artifacts):

1. **builder** — `corepack enable`, `pnpm install --frozen-lockfile` at the
   root (resolves the full workspace graph), `prisma generate`, then
   `pnpm --filter @developer-playground/<app>... build` (the app plus its shared-package
   dependencies).
2. **runner** — copies the installed + built monorepo from the builder and runs
   the app's start script (`start:prod` for api/worker, `start` for web).

The Prisma CLI is intentionally retained in the api runner image so
`migrate deploy` can run at container start.

## Environment & secrets

Compose reads `.env` (via `env_file`) and overrides the network-specific values
so containers talk to the `postgres`/`redis` service hostnames instead of
`localhost`:

- `DATABASE_URL` → `postgresql://…@postgres:5432/…`
- `REDIS_HOST=redis`, `REDIS_URL=redis://redis:6379`

Postgres credentials come from `POSTGRES_USER` / `POSTGRES_PASSWORD` /
`POSTGRES_DB` (defaulting to `developer-playground`); set them in `.env` to match your
`DATABASE_URL`.

**Rotate before production** — never ship the example values:

| Secret | Why |
|---|---|
| `PORTAL_JWT_SECRET` | Forged portal sessions if leaked. |
| `CREDENTIAL_ENCRYPTION_KEY` | Decrypts stored API credentials + webhook secrets (32-byte hex). |
| `POSTGRES_PASSWORD` | Database access. |

For real deployments, inject these via your orchestrator's secret store (Docker
secrets, Kubernetes `Secret`, cloud SSM/Secrets Manager) rather than a committed
`.env`. `.env` is git-ignored.

## Migrations in production

The single-node compose runs `migrate deploy` from the `api` service on startup.
For **multi-replica** deployments, run migrations as a dedicated one-shot job
before rolling out app replicas (so they don't race), then remove the inline
`command:` migrate step from the `api` service.

## Rate limiting

Two layers (spec §15/§16):

1. **Application** — the API applies Redis-backed, per-credential rate limits on
   the public sandbox surface (`/api/runtime`, `/api/webhook-receiver`). This is
   the authoritative limiter.
2. **Edge** — `docker/nginx.conf` defines a coarse per-IP `limit_req_zone`
   (`20r/s`) as a safety net. It ships **commented out**; enable and tune
   `limit_req` for your traffic before relying on it.

## Log retention

Request and webhook logs grow unbounded. Enforce the retention policy (spec §15)
with a scheduled cleanup (a BullMQ repeatable job in the worker, or an external
cron calling a maintenance endpoint) that deletes `RequestLog`,
`WebhookDelivery`, and `InboundWebhookLog` rows older than your policy window.
Configure the window per environment; do not keep sandbox logs indefinitely.

## Scaling

`api`, `worker`, and `web` scale independently:

```bash
docker compose up -d --scale worker=3 --scale api=2
```

If you scale `api`, move migrations to the one-shot job described above. Redis
and Postgres should become managed/HA services in production.

## Observability

Wire Sentry or OpenTelemetry (spec §2/§16) into api and worker. Track request
volume, status distribution, endpoint latency, rule-match frequency, webhook
success/retry rates, queue depth, and auth/validation failures.
