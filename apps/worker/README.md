# @developer-playground/worker

Background worker that delivers **outbound webhooks** for Developer Playground. It is a plain
Node process (no HTTP server) that consumes the BullMQ `webhook-delivery` queue
the API enqueues to.

## What it does

For each delivery job it:

1. Loads the `WebhookDelivery` row (created `PENDING` by the API) and its `Webhook`.
2. **Idempotency** — returns immediately if the delivery is already `SUCCESS`
   (safe across restarts and duplicate jobs, keyed by `idempotencyKey`).
3. Renders `webhook.payloadTemplate` with `@developer-playground/template-engine` using the
   job's `RenderContext` (falls back to the simulated response body).
4. **SSRF guard** — resolves the target host and blocks private/reserved ranges
   (`10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `0/8`, `100.64/10`,
   IPv6 `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped), unless the address is inside
   `WEBHOOK_ALLOWED_PRIVATE_CIDRS`. Only `http`/`https` URLs are allowed.
5. **Signs** the body per `signatureType`:
   - `HMAC_SHA256` → header `X-Signature` (hex HMAC-SHA256 of the JSON body).
   - `CUSTOM_HEADER` → header `X-Webhook-Secret` (decrypted secret).
   - `NONE` → no signature. The secret is stored AES-256-GCM encrypted.
6. `POST`s (or the webhook's method) the payload with a 15s timeout and records
   status, response body (truncated), and response time on the delivery row.
7. **Retries with backoff** — on failure (network error, timeout, SSRF block, or
   non-2xx) it re-enqueues a delayed retry job while `attempt < maxRetries` and
   `retryEnabled`, using intervals **1m → 5m → 15m → 1h → 6h**; otherwise the
   delivery is marked `FAILED`. Retries are managed by the worker itself, so it
   never throws to BullMQ.

## Prerequisites

- Redis (same instance the API enqueues to).
- The **same** `DATABASE_URL` and `CREDENTIAL_ENCRYPTION_KEY` as the API
  (needed to read deliveries and decrypt signing secrets).

## Environment variables

| Variable | Purpose |
|---|---|
| `REDIS_HOST`, `REDIS_PORT` | Redis connection (falls back to parsing `REDIS_URL`). |
| `REDIS_URL` | Fallback Redis connection string. |
| `DATABASE_URL` | Postgres connection (via `@developer-playground/database`). |
| `CREDENTIAL_ENCRYPTION_KEY` | 64 hex chars (32 bytes) — decrypts webhook secrets. |
| `WORKER_CONCURRENCY` | Concurrent jobs (default `5`). |
| `WEBHOOK_ALLOWED_PRIVATE_CIDRS` | Comma-separated CIDRs exempt from the SSRF guard (empty = block all private). |

Copy `.env.example` at the repo root to `.env` and adjust as needed.

## Running

```bash
# from the repo root
pnpm --filter @developer-playground/worker dev      # ts-node, no build step

# or build then run
pnpm --filter @developer-playground/worker build
pnpm --filter @developer-playground/worker start
```

The worker is restart-safe: in-flight jobs are re-queued by BullMQ and the
idempotency check prevents double delivery. Stop it with `Ctrl+C`
(`SIGINT`/`SIGTERM` trigger a graceful shutdown of the worker, queue, and DB
connection).
