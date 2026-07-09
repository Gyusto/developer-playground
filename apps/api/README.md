# @developer-playground/api

NestJS backend for Developer Playground — the management portal API plus the dynamic
**runtime** and **webhook-receiver** engines.

## Prerequisites

- Node 20+
- pnpm 9+
- PostgreSQL
- Redis (used by the outbound webhook queue — see `@developer-playground/worker`)

## Setup

```bash
# from the repo root
cp .env.example .env            # then edit DATABASE_URL / REDIS_* / secrets

pnpm install                    # install workspace dependencies

pnpm db:generate                # prisma generate  (@developer-playground/database)
pnpm db:migrate                 # prisma migrate dev
pnpm db:seed                    # seed the demo workspace, endpoint, webhook + API key
```

`pnpm db:seed` prints the runtime URL and a one-time plaintext API key — copy it,
it is only shown once.

## Running

```bash
pnpm --filter @developer-playground/api dev     # nest start --watch
# production: pnpm --filter @developer-playground/api build && node dist/main.js
```

The dev script runs `nest start --watch`. Webhook delivery is handled out of
process, so **run `@developer-playground/worker` alongside the API** for outbound webhooks to
be delivered.

## Routes

Everything is served under the `/api` prefix on `API_PORT` (default `4000`).

| Area | Path |
|---|---|
| Portal management API | `/api/v1/...` (systems, environments, endpoints, rules, webhooks, logs, credentials) |
| Dynamic runtime | `/api/runtime/:workspaceSlug/:systemSlug/:environmentSlug/*` |
| Inbound webhook receiver | `/api/webhook-receiver/:workspaceSlug/:systemSlug/:environmentSlug/:webhookSlug` |
| Swagger docs | `/api/docs` |

## Example: call the seeded checkout endpoint

```bash
curl -i -X POST \
  http://localhost:4000/api/runtime/flowbitly-qa/azampay-checkout/uat/v1/checkout \
  -H "X-API-Key: <API_KEY_FROM_SEED>" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "ORD-10001",
    "amount": 15000,
    "currency": "TZS",
    "customer": { "phone": "+255677094181", "name": "Test Customer" }
  }'
```

The endpoint returns a `PENDING` initiation response and, after the configured
10-second delay, the worker delivers the `PAYMENT_COMPLETED` callback to the
webhook's target URL.
