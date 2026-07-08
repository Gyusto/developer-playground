# Security

This document maps every requirement in **spec §15 (Security Requirements)** to
how Developer Playground addresses it and where it lives. Items owned by app code
(`apps/*`, `packages/*`) are marked with the responsible module; items owned by
infrastructure (this workstream) point at the concrete file.

## Requirement → control mapping

| # | Spec §15 requirement | How it is addressed | Where |
|---|---|---|---|
| 1 | Hash portal passwords with Argon2/bcrypt | `User.passwordHash` stores a one-way hash; auth module hashes on signup and verifies on login. | `packages/database` schema (`User.passwordHash`) · `apps/api` `auth/` |
| 2 | Store API credentials & webhook secrets encrypted at rest | AES-256-GCM using `CREDENTIAL_ENCRYPTION_KEY`; verifiable tokens stored as `secretHash`, signing secrets as `encryptedSecret`. | `ApiCredential.encryptedSecret`/`secretHash`, `Webhook.encryptedSecret`, `InboundWebhookEndpoint.encryptedSecret` · `.env` `CREDENTIAL_ENCRYPTION_KEY` · `apps/api` `credentials/` |
| 3 | Display a secret only once at generation | Only the hash/ciphertext is persisted; the plaintext is returned once from the create/rotate call and never again. `keyPrefix` is kept for display. | `apps/api` `credentials/` · schema `ApiCredential.keyPrefix` |
| 4 | Allow credential rotation & revocation | `POST /credentials/:id/rotate`, `DELETE /credentials/:id`; `CredentialStatus` + `revokedAt` gate runtime auth. | spec §11 Credentials · schema `ApiCredential.status`/`revokedAt` |
| 5 | Per-workspace role-based access control | `WorkspaceMember.role` (`OWNER`/`ADMIN`/`DEVELOPER`/`QA`/`VIEWER`); portal guards scope every query to the caller's workspace. | schema `WorkspaceRole` · `apps/api` `auth/` guards |
| 6 | Rate limit public sandbox endpoints | App-layer Redis limiter on `/api/runtime` + `/api/webhook-receiver` (authoritative); coarse per-IP edge limiter in nginx as a safety net. | `apps/api` runtime · `docker/nginx.conf` (`limit_req_zone developer-playground_runtime`) |
| 7 | Prevent SSRF when sending webhooks | Worker validates the resolved target IP before delivery; blocks non-public ranges unless allowlisted. | `apps/worker` dispatch · `.env` `WEBHOOK_ALLOWED_PRIVATE_CIDRS` |
| 8 | Block webhook targets on private/restricted IP ranges unless admin-allowed | Same guard as #7; `WEBHOOK_ALLOWED_PRIVATE_CIDRS` is the explicit admin allowlist (empty = block all private ranges). | `.env` `WEBHOOK_ALLOWED_PRIVATE_CIDRS` · `apps/worker` |
| 9 | Validate JSON payload size | `MAX_JSON_BODY_BYTES` enforced by the API body parser; nginx `client_max_body_size 2m` rejects oversized bodies at the edge. | `.env` `MAX_JSON_BODY_BYTES` · `docker/nginx.conf` |
| 10 | Redact configured sensitive fields in logs | Logging service redacts configured paths before persisting request/response bodies. | `apps/api` `request-logs/` (`RequestLoggingService`) |
| 11 | Record all configuration changes in audit logs | `AuditLog` captures action/entity/actor/metadata for every portal mutation. | schema `AuditLog` · `apps/api` `audit-logs/` |
| 12 | Secure headers & strict CORS | API sets security headers (Helmet) + a strict CORS allowlist; nginx adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. | `apps/api` bootstrap · `docker/nginx.conf` |
| 13 | Prevent arbitrary code execution in scripted responses | `SCRIPTED` mode is **excluded from the MVP** (spec §17). Phase Two runs it only in a sandboxed isolate with time limits + an object allowlist (spec §6.5). | Not in MVP · `apps/api` runtime (future) |
| 14 | Expire old request & webhook logs (retention) | Scheduled cleanup deletes `RequestLog` / `WebhookDelivery` / `InboundWebhookLog` past the retention window. | `apps/worker` (repeatable job) · see [deployment.md](./deployment.md#log-retention) |

## Roles (spec §15)

`WorkspaceRole` in the Prisma schema encodes the recommended roles:

- **OWNER** → Workspace Owner
- **ADMIN** → Administrator
- **DEVELOPER** → Developer
- **QA** → QA Tester
- **VIEWER** → Viewer

## Secrets handling summary

- Nothing sensitive is committed: `.env` is git-ignored and excluded from Docker
  images by `.dockerignore`. Only `.env.example` (placeholder values) is tracked.
- `CREDENTIAL_ENCRYPTION_KEY` and `PORTAL_JWT_SECRET` **must** be rotated away
  from the example values before any non-local deployment — see
  [deployment.md](./deployment.md#environment--secrets).
- In production, inject secrets via an orchestrator secret store rather than a
  file on disk.

## Acceptance-criteria cross-check (spec §19 Security)

| Criterion | Mechanism |
|---|---|
| Unauthorized users cannot access another workspace | RBAC guards scope every query by `workspaceId` (#5). |
| Revoked API keys no longer work | Runtime auth rejects `REVOKED` credentials (#4). |
| Secrets not shown again after generation | Only hashes/ciphertext persisted; plaintext returned once (#2/#3). |
| Sensitive fields redacted from logs | Logging redaction (#10). |
