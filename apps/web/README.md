# @developer-playground/web

The Next.js (App Router) portal for **Developer Playground — Dynamic API Integration Sandbox**.
It lets developers and QA teams create mock Integration Systems, environments, dynamic
API endpoints, response rules, outbound/inbound webhooks, credentials and browse request
& webhook logs — all backed by the Portal Management API (spec section 11).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with hand-written, accessible **shadcn/ui-style** primitives (built on Radix)
- **React Hook Form** + **Zod** on every create/edit form
- **TanStack Query** for server state
- **Monaco Editor** (`@monaco-editor/react`, lazy-loaded, `ssr: false`) for JSON editing
- **next-themes** for light/dark mode

## Getting started

From the monorepo root:

```bash
pnpm install
pnpm --filter @developer-playground/web dev
```

The app runs on http://localhost:3000 and expects the Portal Management API on
`NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`).

Create `apps/web/.env.local` (see `.env.example`) if your API runs elsewhere:

```bash
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

Other scripts:

```bash
pnpm --filter @developer-playground/web build       # production build
pnpm --filter @developer-playground/web start       # serve the build
pnpm --filter @developer-playground/web typecheck   # tsc --noEmit
pnpm --filter @developer-playground/web lint        # next lint
```

## How auth works

- `POST /api/v1/auth/login` returns `{ accessToken, user }`.
- The JWT is stored in `localStorage` and mirrored to the `developer-playground_token` cookie.
- `middleware.ts` redirects unauthenticated users to `/login` and authenticated users
  away from the auth pages.
- `lib/auth/use-auth.tsx` exposes a `useAuth()` hook; `AuthGuard` protects the portal shell.
- `lib/api-client.ts` attaches the bearer token, unwraps the `{ success, data, meta }`
  envelope and throws a typed `ApiError`. A `401` clears the stored token.

## Route structure

```
app/
├── (auth)/
│   ├── login/
│   └── forgot-password/
├── (portal)/                 # authenticated shell: sidebar + top bar
│   ├── dashboard/            # metric cards + recent activity (spec 10.2)
│   ├── systems/
│   │   ├── page.tsx          # systems list
│   │   ├── new/
│   │   └── [systemId]/
│   │       ├── overview/
│   │       ├── environments/
│   │       ├── endpoints/    # hosts the EndpointBuilder
│   │       ├── webhooks/
│   │       ├── credentials/
│   │       ├── logs/
│   │       └── documentation/
│   ├── webhook-inbox/        # inbound webhook viewer: inspect / copy / replay / diff
│   ├── team/
│   └── settings/
├── layout.tsx                # html + Providers
└── providers.tsx             # TanStack Query, theme, toast, auth
```

> Note: the spec's route tree is followed, with the authenticated pages grouped under a
> `(portal)` route group so the sidebar/top-bar shell and `AuthGuard` wrap them without
> affecting the URLs (`/dashboard`, `/systems`, …).

## Reusable components

- **Forms** (`components/forms`): `SystemForm`, `EnvironmentForm`, `EndpointBuilder`
  (the 14-section API builder), `ResponseRuleBuilder` (15 operators from spec 6.2),
  `WebhookBuilder`, `CredentialManager`, `ParamRowsEditor`.
- **Shared** (`components/shared`): `MonacoJsonEditor`, `JsonField`, `JsonViewer`,
  `JsonDiffViewer`, `CurlCodePreview`, `KeyValueEditor`, `EnvironmentPicker`, `StatCard`,
  badges, `CopyButton`, `EmptyState`, `PageHeader`, `Field`.
- **Logs** (`components/logs`): `RequestLogDetails`, `WebhookDeliveryTimeline`.
- **Docs** (`components/docs`): `ApiDocumentationViewer` (human-readable + OpenAPI export).
- **UI primitives** (`components/ui`): Button, Input, Textarea, Label, Card, Badge, Dialog,
  Tabs, Select, Switch, Separator, Table, Toast, DropdownMenu, Skeleton.

## Notes & placeholders

- The **dashboard** reads `GET /api/v1/dashboard/metrics`; if that endpoint is not present
  it degrades gracefully to zeroed placeholder cards.
- **Credentials** show the secret exactly once (on create/rotate) via a one-time reveal dialog.
- **Response rules**, **Test** and generated **Docs** tabs in the EndpointBuilder become
  available after the endpoint is first saved (they need an endpoint id).
- Monaco is lazy-loaded and shows a spinner fallback, so SSR/no-JS degrade gracefully.
- The runtime base URL shown in the UI falls back to a computed
  `/api/runtime/{workspace}/{system}/{env}` path when the API does not return `baseUrl`.
