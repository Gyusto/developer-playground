"use client";

import { API_BASE_URL } from "@/lib/api-client";
import type { ApiEndpoint, Environment, IntegrationSystem, Webhook } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MethodBadge, StatusCodeBadge } from "@/components/shared/badges";
import { JsonViewer } from "@/components/shared/json-viewer";
import { CurlCodePreview } from "@/components/shared/curl-code-preview";
import { CopyButton } from "@/components/shared/copy-button";
import { Badge } from "@/components/ui/badge";

const AUTH_INSTRUCTIONS: Record<string, string> = {
  NONE: "This endpoint requires no authentication.",
  API_KEY: "Send your sandbox API key in the X-API-Key header.",
  BASIC: "Use HTTP Basic authentication with your issued credentials.",
  BEARER: "Send a Bearer token in the Authorization header.",
  HMAC: "Sign the request body and send the signature in the configured header.",
};

export function ApiDocumentationViewer({
  system,
  environment,
  endpoints,
  webhooks,
}: {
  system?: IntegrationSystem;
  environment?: Environment;
  endpoints: ApiEndpoint[];
  webhooks?: Webhook[];
}) {
  const baseUrl =
    environment?.baseUrl ??
    `${API_BASE_URL}/api/runtime/workspace/${system?.slug ?? "system"}/${environment?.slug ?? "env"}`;

  const openApi = buildOpenApi(system, baseUrl, endpoints);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{system?.name ?? "Integration"} API</CardTitle>
          <CopyButton value={JSON.stringify(openApi, null, 2)} label="Copy OpenAPI" />
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {system?.description && <p className="text-muted-foreground">{system.description}</p>}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Base URL</span>
            <code className="scrollbar-thin overflow-x-auto rounded bg-muted px-2 py-0.5 text-xs">{baseUrl}</code>
          </div>
          {environment && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Environment</span>
              <Badge variant="secondary">{environment.name}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {endpoints
        .filter((e) => e.name || e.path)
        .map((endpoint) => (
          <Card key={endpoint.id}>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <MethodBadge method={endpoint.method} />
                <code className="font-mono text-sm">{endpoint.path}</code>
              </div>
              <CardTitle className="text-base">{endpoint.name}</CardTitle>
              {endpoint.description && (
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Authentication</span>
                <Badge variant="outline">{endpoint.authType}</Badge>
                <span className="text-xs text-muted-foreground">{AUTH_INSTRUCTIONS[endpoint.authType]}</span>
              </div>

              {endpoint.headers && endpoint.headers.length > 0 && (
                <DocList title="Headers" items={endpoint.headers.map((h) => `${h.name}${h.required ? " (required)" : ""}: ${h.type}`)} />
              )}
              {endpoint.queryParams && endpoint.queryParams.length > 0 && (
                <DocList title="Query parameters" items={endpoint.queryParams.map((q) => `${q.name}${q.required ? " (required)" : ""}: ${q.type}`)} />
              )}

              {endpoint.requestSchema != null && (
                <div>
                  <p className="mb-1 text-sm font-medium">Request schema</p>
                  <JsonViewer value={endpoint.requestSchema} maxHeight={220} />
                </div>
              )}

              <div>
                <p className="mb-1 flex items-center gap-2 text-sm font-medium">
                  Response example <StatusCodeBadge code={endpoint.defaultStatusCode} />
                </p>
                <JsonViewer value={endpoint.defaultResponseBody} maxHeight={220} />
              </div>

              <div>
                <p className="mb-1 text-sm font-medium">Code examples</p>
                <CurlCodePreview
                  config={{
                    method: endpoint.method,
                    url: `${baseUrl}${endpoint.path}`,
                    headers: {
                      "Content-Type": "application/json",
                      ...(endpoint.authType === "API_KEY" ? { "X-API-Key": "sandbox_key_123" } : {}),
                    },
                    body: endpoint.method === "GET" ? undefined : exampleFromSchema(endpoint.requestSchema),
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}

      {webhooks && webhooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {webhooks.map((w) => (
              <div key={w.id} className="space-y-1 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{w.triggerEvent}</Badge>
                  <span className="text-sm font-medium">{w.name}</span>
                  {w.signatureType !== "NONE" && <Badge variant="outline">{w.signatureType}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">POST to your configured URL: {w.targetUrl}</p>
                {w.payloadTemplate != null && <JsonViewer value={w.payloadTemplate} maxHeight={180} />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DocList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{title}</p>
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {items.map((it, i) => (
          <li key={i} className="font-mono">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function exampleFromSchema(schema: unknown): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== "object") return undefined;
  const s = schema as { properties?: Record<string, { type?: string; enum?: unknown[] }> };
  if (!s.properties) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(s.properties)) {
    if (prop.enum && prop.enum.length) out[key] = prop.enum[0];
    else if (prop.type === "number" || prop.type === "integer") out[key] = 0;
    else if (prop.type === "boolean") out[key] = true;
    else if (prop.type === "object") out[key] = {};
    else out[key] = "string";
  }
  return out;
}

function buildOpenApi(system: IntegrationSystem | undefined, baseUrl: string, endpoints: ApiEndpoint[]) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of endpoints) {
    if (!e.path) continue;
    const openApiPath = e.path.replace(/:(\w+)/g, "{$1}");
    paths[openApiPath] = paths[openApiPath] ?? {};
    paths[openApiPath][e.method.toLowerCase()] = {
      summary: e.name,
      description: e.description ?? undefined,
      responses: {
        [String(e.defaultStatusCode)]: {
          description: "Simulated response",
          content: { "application/json": { example: e.defaultResponseBody ?? {} } },
        },
      },
    };
  }
  return {
    openapi: "3.0.3",
    info: { title: `${system?.name ?? "Integration"} Sandbox API`, version: "1.0.0" },
    servers: [{ url: baseUrl }],
    paths,
  };
}
