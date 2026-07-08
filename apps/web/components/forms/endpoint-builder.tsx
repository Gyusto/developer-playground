"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Save } from "lucide-react";
import { endpointsApi, webhooksApi, type TestEndpointResult } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { AUTH_TYPES, HTTP_METHODS, RESPONSE_MODES, HTTP_STATUS_OPTIONS, TEMPLATE_VARIABLES } from "@/lib/constants";
import type { ApiEndpoint, AuthType, Environment, HttpMethod, IntegrationSystem, ResponseMode } from "@/lib/types";
import { prettyJson, safeParseJson } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/shared/field";
import { JsonField } from "@/components/shared/json-field";
import { JsonViewer } from "@/components/shared/json-viewer";
import { KeyValueEditor, recordToRows, rowsToRecord, type KeyValueRow } from "@/components/shared/key-value-editor";
import { ParamRowsEditor, type ParamRow } from "@/components/forms/param-rows-editor";
import { ResponseRuleBuilder } from "@/components/forms/response-rule-builder";
import { MethodBadge, StatusCodeBadge } from "@/components/shared/badges";
import { CurlCodePreview } from "@/components/shared/curl-code-preview";
import { ApiDocumentationViewer } from "@/components/docs/api-documentation-viewer";
import { useToast, useToastError } from "@/components/ui/use-toast";

interface BuilderState {
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  authType: AuthType;
  headers: ParamRow[];
  queryParams: ParamRow[];
  pathParams: ParamRow[];
  requestSchemaText: string;
  responseMode: ResponseMode;
  defaultStatusCode: number;
  defaultHeaders: KeyValueRow[];
  defaultResponseBodyText: string;
  delayMs: number;
  timeoutEnabled: boolean;
  isActive: boolean;
  webhookId: string | null;
}

function toState(endpoint?: ApiEndpoint): BuilderState {
  return {
    name: endpoint?.name ?? "",
    method: endpoint?.method ?? "POST",
    path: endpoint?.path ?? "/v1/",
    description: endpoint?.description ?? "",
    authType: endpoint?.authType ?? "API_KEY",
    headers: (endpoint?.headers as ParamRow[]) ?? [],
    queryParams: (endpoint?.queryParams as ParamRow[]) ?? [],
    pathParams: (endpoint?.pathParams as ParamRow[]) ?? [],
    requestSchemaText: endpoint?.requestSchema ? prettyJson(endpoint.requestSchema) : "",
    responseMode: endpoint?.responseMode ?? "STATIC",
    defaultStatusCode: endpoint?.defaultStatusCode ?? 200,
    defaultHeaders: recordToRows(endpoint?.defaultHeaders),
    defaultResponseBodyText: endpoint?.defaultResponseBody
      ? prettyJson(endpoint.defaultResponseBody)
      : '{\n  "success": true\n}',
    delayMs: endpoint?.delayMs ?? 0,
    timeoutEnabled: endpoint?.timeoutEnabled ?? false,
    isActive: endpoint?.isActive ?? true,
    webhookId: endpoint?.webhookId ?? null,
  };
}

export function EndpointBuilder({
  environmentId,
  environment,
  system,
  endpoint,
  onDone,
}: {
  environmentId: string;
  environment?: Environment;
  system?: IntegrationSystem;
  endpoint?: ApiEndpoint;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [state, setState] = useState<BuilderState>(toState(endpoint));
  const [currentId, setCurrentId] = useState<string | undefined>(endpoint?.id);
  const [schemaValid, setSchemaValid] = useState(true);
  const [bodyValid, setBodyValid] = useState(true);

  const { data: webhooks } = useQuery({
    queryKey: qk.webhooks(environmentId),
    queryFn: () => webhooksApi.listForEnvironment(environmentId),
  });

  function patch(p: Partial<BuilderState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function buildPayload(): Partial<ApiEndpoint> {
    const schema = state.requestSchemaText.trim()
      ? safeParseJson(state.requestSchemaText)
      : { ok: true as const, value: undefined };
    const body = state.defaultResponseBodyText.trim()
      ? safeParseJson(state.defaultResponseBodyText)
      : { ok: true as const, value: undefined };
    return {
      name: state.name,
      method: state.method,
      path: state.path,
      description: state.description || null,
      authType: state.authType,
      headers: state.headers,
      queryParams: state.queryParams,
      pathParams: state.pathParams,
      requestSchema: schema.ok ? schema.value : undefined,
      responseMode: state.responseMode,
      defaultStatusCode: state.defaultStatusCode,
      defaultHeaders: rowsToRecord(state.defaultHeaders),
      defaultResponseBody: body.ok ? body.value : undefined,
      delayMs: state.delayMs,
      timeoutEnabled: state.timeoutEnabled,
      isActive: state.isActive,
      webhookId: state.webhookId,
    };
  }

  const save = useMutation({
    mutationFn: () =>
      currentId
        ? endpointsApi.update(currentId, buildPayload())
        : endpointsApi.create(environmentId, buildPayload()),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: qk.endpoints(environmentId) });
      setCurrentId(saved.id);
      toast({ variant: "success", title: currentId ? "Endpoint updated" : "Endpoint created" });
    },
    onError: (e) => toastError(e),
  });

  const runtimeUrl = useMemo(() => {
    if (environment?.baseUrl) return `${environment.baseUrl}${state.path}`;
    const ws = "workspace";
    return `${API_BASE_URL}/api/runtime/${ws}/${system?.slug ?? "system"}/${environment?.slug ?? "env"}${state.path}`;
  }, [environment, system, state.path]);

  const canPersist = state.name.trim() && state.path.trim() && schemaValid && bodyValid;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MethodBadge method={state.method} />
          <span className="font-mono text-sm">{state.path || "/"}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone}>
            Close
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!canPersist}>
            <Save className="h-4 w-4" /> {currentId ? "Save changes" : "Create endpoint"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="flex-wrap">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="request">Request</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        {/* Configuration: general, method+path, auth, delay/timeout, webhook trigger */}
        <TabsContent value="config" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={state.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Initiate Checkout" />
            </Field>
            <Field label="Active">
              <div className="flex h-9 items-center gap-2">
                <Switch checked={state.isActive} onCheckedChange={(v) => patch({ isActive: v })} />
                <span className="text-sm text-muted-foreground">{state.isActive ? "Enabled" : "Disabled"}</span>
              </div>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label="Method">
              <SimpleSelect
                value={state.method}
                onValueChange={(v) => patch({ method: v as HttpMethod })}
                options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
              />
            </Field>
            <Field label="Path" required hint="Use :param for path parameters, e.g. /v1/transactions/:id">
              <Input value={state.path} onChange={(e) => patch({ path: e.target.value })} placeholder="/v1/checkout" className="font-mono" />
            </Field>
          </div>

          <Field label="Description">
            <Textarea value={state.description} onChange={(e) => patch({ description: e.target.value })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Authentication">
              <SimpleSelect
                value={state.authType}
                onValueChange={(v) => patch({ authType: v as AuthType })}
                options={AUTH_TYPES.map((a) => ({ value: a, label: a }))}
              />
            </Field>
            <Field label="Delay (ms)" hint="Artificial response delay">
              <Input type="number" value={state.delayMs} onChange={(e) => patch({ delayMs: Number(e.target.value) })} />
            </Field>
            <Field label="Simulate timeout">
              <div className="flex h-9 items-center gap-2">
                <Switch checked={state.timeoutEnabled} onCheckedChange={(v) => patch({ timeoutEnabled: v })} />
                <span className="text-sm text-muted-foreground">No response / gateway timeout</span>
              </div>
            </Field>
          </div>

          <Field label="Webhook trigger" hint="Fire an outbound webhook after this endpoint responds">
            <SimpleSelect
              value={state.webhookId ?? "none"}
              onValueChange={(v) => patch({ webhookId: v === "none" ? null : v })}
              options={[
                { value: "none", label: "No webhook" },
                ...(webhooks ?? []).map((w) => ({ value: w.id, label: `${w.name} (${w.triggerEvent})` })),
              ]}
            />
          </Field>
        </TabsContent>

        {/* Request: headers, query params, path params, request-body schema */}
        <TabsContent value="request" className="space-y-6">
          <Section title="Headers">
            <ParamRowsEditor
              rows={state.headers}
              onChange={(r) => patch({ headers: r })}
              showExample
              namePlaceholder="X-API-Key"
              emptyHint="No required headers configured."
            />
          </Section>
          <Section title="Query parameters">
            <ParamRowsEditor
              rows={state.queryParams}
              onChange={(r) => patch({ queryParams: r })}
              showAllowedValues
              namePlaceholder="status"
              emptyHint="No query parameters configured."
            />
          </Section>
          <Section title="Path parameters">
            <ParamRowsEditor
              rows={state.pathParams}
              onChange={(r) => patch({ pathParams: r })}
              namePlaceholder="transactionId"
              emptyHint="Add path parameters for any :params in the path."
            />
          </Section>
          <Section title="Request body schema" description="JSON Schema used to validate incoming requests.">
            <JsonField
              value={state.requestSchemaText}
              onChange={(v) => patch({ requestSchemaText: v })}
              onValidChange={setSchemaValid}
              height={260}
            />
          </Section>
        </TabsContent>

        {/* Response: mode, default status/headers, payload editor */}
        <TabsContent value="response" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Response mode">
              <SimpleSelect
                value={state.responseMode}
                onValueChange={(v) => patch({ responseMode: v as ResponseMode })}
                options={RESPONSE_MODES.map((m) => ({ value: m, label: m }))}
              />
            </Field>
            <Field label="Default status code">
              <SimpleSelect
                value={String(state.defaultStatusCode)}
                onValueChange={(v) => patch({ defaultStatusCode: Number(v) })}
                options={HTTP_STATUS_OPTIONS.map((c) => ({ value: String(c), label: String(c) }))}
              />
            </Field>
          </div>

          {state.responseMode === "RULE_BASED" && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              This endpoint uses rule-based responses. The payload below is the default/fallback when no rule matches.
              Configure rules in the <strong>Rules</strong> tab.
            </p>
          )}

          <Section title="Default response headers">
            <KeyValueEditor rows={state.defaultHeaders} onChange={(r) => patch({ defaultHeaders: r })} addLabel="Add header" />
          </Section>

          <Section title="Response payload" description="Supports template variables.">
            <JsonField
              value={state.defaultResponseBodyText}
              onChange={(v) => patch({ defaultResponseBodyText: v })}
              onValidChange={setBodyValid}
              height={260}
            />
            <TemplateVariableHelp />
          </Section>
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules">
          {currentId ? (
            <ResponseRuleBuilder endpointId={currentId} />
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Save the endpoint first to add response rules.
            </p>
          )}
        </TabsContent>

        {/* Test */}
        <TabsContent value="test">
          {currentId ? (
            <EndpointTester endpointId={currentId} runtimeUrl={runtimeUrl} state={state} />
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Save the endpoint first to run a test request.
            </p>
          )}
        </TabsContent>

        {/* Docs */}
        <TabsContent value="docs">
          <ApiDocumentationViewer
            system={system}
            environment={environment}
            endpoints={[
              {
                ...(endpoint ?? ({} as ApiEndpoint)),
                ...buildPayload(),
                id: currentId ?? "new",
                environmentId,
              } as ApiEndpoint,
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function TemplateVariableHelp() {
  return (
    <details className="rounded-md border bg-muted/30 p-3 text-xs">
      <summary className="cursor-pointer font-medium">Template variables</summary>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {TEMPLATE_VARIABLES.map((v) => (
          <li key={v.token} className="flex gap-2">
            <code className="text-primary">{v.token}</code>
            <span className="text-muted-foreground">{v.description}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function EndpointTester({
  endpointId,
  runtimeUrl,
  state,
}: {
  endpointId: string;
  runtimeUrl: string;
  state: BuilderState;
}) {
  const toastError = useToastError();
  const [bodyText, setBodyText] = useState('{\n  \n}');
  const [result, setResult] = useState<TestEndpointResult | null>(null);

  const run = useMutation({
    mutationFn: () => {
      const parsed = safeParseJson(bodyText);
      return endpointsApi.test(endpointId, { body: parsed.ok ? parsed.value : {} });
    },
    onSuccess: (r) => setResult(r),
    onError: (e) => toastError(e),
  });

  const sampleHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(state.authType === "API_KEY" ? { "X-API-Key": "sandbox_key_123" } : {}),
    ...(state.authType === "BEARER" ? { Authorization: "Bearer <token>" } : {}),
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sample request body</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <JsonField value={bodyText} onChange={setBodyText} height={200} />
          <Button onClick={() => run.mutate()} loading={run.isPending} disabled={state.method === "GET"}>
            <Play className="h-4 w-4" /> Send test request
          </Button>
          {state.method === "GET" && (
            <p className="text-xs text-muted-foreground">GET endpoints are tested without a body.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            Response
            {result && <StatusCodeBadge code={result.statusCode} />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result ? (
            <>
              {result.matchedRuleName && (
                <p className="text-xs text-muted-foreground">
                  Matched rule: <span className="font-medium text-foreground">{result.matchedRuleName}</span>
                </p>
              )}
              <JsonViewer value={result.body} maxHeight={220} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Run a request to see the simulated response.</p>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <CurlCodePreview
          config={{
            method: state.method,
            url: runtimeUrl,
            headers: sampleHeaders,
            body: state.method === "GET" ? undefined : safeParseJson(bodyText).ok ? JSON.parse(bodyText) : bodyText,
          }}
        />
      </div>
    </div>
  );
}
