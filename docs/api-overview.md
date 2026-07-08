# API overview

A human-readable companion to the generated OpenAPI spec (served at
`/api/docs`). It summarizes the three HTTP surfaces, the runtime URL scheme,
authentication, response modes, template variables, and the webhook flow.

> The portal management API (`/api/v1/...`, spec §11) is fully documented in
> Swagger — this page focuses on the parts that are convention rather than
> generated schema.

## HTTP surfaces

| Surface | Base path | Auth | Purpose |
|---|---|---|---|
| Portal management | `/api/v1` | Portal JWT | CRUD for systems, environments, endpoints, rules, webhooks, credentials, logs. |
| Dynamic runtime | `/api/runtime` | Per-endpoint sandbox auth | Executes configured mock endpoints. |
| Webhook receiver | `/api/webhook-receiver` | Optional signature check | Captures inbound webhooks. |
| Docs | `/api/docs` | — | Swagger UI + OpenAPI JSON. |

## Runtime URL scheme (spec §4)

```text
{METHOD} /api/runtime/{workspaceSlug}/{systemSlug}/{environmentSlug}/{endpointPath}
```

Example:

```http
POST /api/runtime/otapp-qa/azampay-checkout/uat/v1/checkout
X-API-Key: sandbox_key_123
Content-Type: application/json
```

The runtime resolves workspace → system → environment → endpoint (by method +
path), validates auth and the request, evaluates the response, applies any
delay/timeout, logs the call, and enqueues webhooks. Endpoints go live the
moment they are created — **no redeploy** (spec §19).

## Authentication types (spec §3.4 `authType`)

Configured per endpoint; the runtime enforces the matching credential.

| `authType` | Client sends | Verified against |
|---|---|---|
| `NONE` | nothing | open endpoint |
| `API_KEY` | `X-API-Key: <key>` | hashed credential (`ApiCredential.secretHash`) |
| `BASIC` | `Authorization: Basic <base64>` | username + hashed secret |
| `BEARER` | `Authorization: Bearer <token>` | hashed token |
| `HMAC` | signature header over the body | shared secret (`encryptedSecret`), recomputed and compared |

Credentials are shown once at creation/rotation and can be revoked; revoked keys
stop working immediately (see [security.md](./security.md)).

## Response modes (spec §6)

Set per endpoint via `responseMode`:

| Mode | Behaviour | MVP? |
|---|---|---|
| `STATIC` | Always returns the configured status/headers/body. | ✅ |
| `RULE_BASED` | Rules evaluated by **ascending priority**; first matching active rule wins; falls back to the default response. The matched rule name is recorded in the log. | ✅ |
| `RANDOM` | Weighted random selection among variants. | Phase Two |
| `SEQUENCE` | Cycles responses in order (state in `EndpointSequenceState`), e.g. `PENDING → PROCESSING → SUCCESS`. | Phase Two |
| `SCRIPTED` | Sandboxed script computes the response. **Excluded from MVP** for safety (spec §17). | Phase Two |

### Rule conditions (spec §6.2)

Each condition is `{ source, operator, value }` where `source` is a template
path (e.g. `request.body.amount`). Supported operators: `EQUALS`, `NOT_EQUALS`,
`CONTAINS`, `NOT_CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `GREATER_THAN`,
`GREATER_THAN_OR_EQUAL`, `LESS_THAN`, `LESS_THAN_OR_EQUAL`, `EXISTS`,
`NOT_EXISTS`, `MATCHES_REGEX`, `IN`, `NOT_IN`.

## Template variables (spec §7)

Response and webhook payloads support `{{...}}` variables, rendered by
`@developer-playground/template-engine`:

| Variable | Resolves to |
|---|---|
| `{{uuid}}` | a generated UUID |
| `{{now}}` | current ISO-8601 datetime |
| `{{timestamp}}` | Unix timestamp |
| `{{randomNumber:min:max}}` | random number in range |
| `{{randomString:length}}` | random string |
| `{{request.body.<field>}}` | request body value |
| `{{request.query.<field>}}` | query parameter |
| `{{request.params.<field>}}` | path parameter |
| `{{request.headers.<field>}}` | request header |
| `{{request.id}}` | internal request-log ID |
| `{{environment.<name>}}` | environment variable |
| `{{system.name}}` | integration system name |
| `{{response.body.<field>}}` | (webhooks) value from the returned response |

## Delay & timeout simulation (spec §3.4 / §6)

- `delayMs` — the runtime waits this long before responding (excluded from the
  200 ms static-response performance target, spec §16).
- `timeoutEnabled` / a `timeout` variant — simulates no response / gateway
  timeout instead of returning a body.

## Webhook flow

### Outbound (spec §8.1)

1. Runtime returns the API response and enqueues a delivery job (BullMQ/Redis).
2. Worker waits for `delayMs`, renders the payload template (with
   `request.*`/`response.*` data), and signs it when `signatureType` is set
   (`HMAC_SHA256` or `CUSTOM_HEADER`).
3. Worker POSTs to `targetUrl` (after the SSRF check) and records the attempt in
   `WebhookDelivery`.
4. Failed deliveries retry with exponential backoff; recommended intervals:
   `1m, 5m, 15m, 1h, 6h`. Idempotency keys prevent duplicate deliveries
   (spec §16). Users can manually retry via
   `POST /api/v1/webhook-deliveries/:deliveryId/retry`.

### Inbound (spec §8.2)

```text
POST /api/webhook-receiver/{workspaceSlug}/{systemSlug}/{environmentSlug}/{webhookSlug}
```

The receiver captures method, URL, headers, query, body, source IP, content
type, timestamp, signature-validation result, and processing status into
`InboundWebhookLog`. Received webhooks can be inspected, copied, replayed, and
forwarded from the portal.

## OpenAPI export

The full machine-readable contract is generated by the API and served at
`/api/docs` (Swagger UI) with the raw JSON alongside it (spec §10.9 / §17). Per
integration system, the portal also generates human-readable docs with example
cURL / JavaScript / PHP / Java / Python requests.
