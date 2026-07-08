"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpointsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { HTTP_METHODS, SIGNATURE_TYPES } from "@/lib/constants";
import type { HttpMethod, SignatureType, Webhook } from "@/lib/types";
import { prettyJson, safeParseJson } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { JsonField } from "@/components/shared/json-field";
import { KeyValueEditor, recordToRows, rowsToRecord, type KeyValueRow } from "@/components/shared/key-value-editor";

export interface WebhookBuilderValues {
  name: string;
  triggerEvent: string;
  endpointId: string | null;
  targetUrl: string;
  method: HttpMethod;
  headers: Record<string, string>;
  payloadTemplate: unknown;
  delayMs: number;
  signatureType: SignatureType;
  secret?: string;
  retryEnabled: boolean;
  maxRetries: number;
  isActive: boolean;
}

const DEFAULT_PAYLOAD = `{
  "event": "PAYMENT_COMPLETED",
  "eventId": "{{uuid}}",
  "transactionId": "{{response.body.transactionId}}",
  "externalId": "{{request.body.externalId}}",
  "status": "SUCCESS",
  "occurredAt": "{{now}}"
}`;

export function WebhookBuilder({
  environmentId,
  initial,
  onSubmit,
  submitting,
  submitLabel = "Save webhook",
}: {
  environmentId: string;
  initial?: Partial<Webhook>;
  onSubmit: (values: WebhookBuilderValues) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [triggerEvent, setTriggerEvent] = useState(initial?.triggerEvent ?? "PAYMENT_COMPLETED");
  const [endpointId, setEndpointId] = useState<string | null>(initial?.endpointId ?? null);
  const [targetUrl, setTargetUrl] = useState(initial?.targetUrl ?? "");
  const [method, setMethod] = useState<HttpMethod>(initial?.method ?? "POST");
  const [headers, setHeaders] = useState<KeyValueRow[]>(recordToRows(initial?.headers));
  const [payloadText, setPayloadText] = useState(
    initial?.payloadTemplate ? prettyJson(initial.payloadTemplate) : DEFAULT_PAYLOAD,
  );
  const [delayMs, setDelayMs] = useState(initial?.delayMs ?? 0);
  const [signatureType, setSignatureType] = useState<SignatureType>(initial?.signatureType ?? "NONE");
  const [secret, setSecret] = useState("");
  const [retryEnabled, setRetryEnabled] = useState(initial?.retryEnabled ?? true);
  const [maxRetries, setMaxRetries] = useState(initial?.maxRetries ?? 5);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [payloadValid, setPayloadValid] = useState(true);

  const { data: endpoints } = useQuery({
    queryKey: qk.endpoints(environmentId),
    queryFn: () => endpointsApi.listForEnvironment(environmentId),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = safeParseJson(payloadText);
    onSubmit({
      name,
      triggerEvent,
      endpointId,
      targetUrl,
      method,
      headers: rowsToRecord(headers),
      payloadTemplate: parsed.ok ? parsed.value : {},
      delayMs,
      signatureType,
      secret: secret || undefined,
      retryEnabled,
      maxRetries,
      isActive,
    });
  }

  const valid = name.trim() && targetUrl.trim() && triggerEvent.trim() && payloadValid;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Webhook name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Payment completed callback" />
        </Field>
        <Field label="Trigger event" required>
          <Input value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} placeholder="PAYMENT_COMPLETED" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Triggering endpoint" hint="Optional — fire after a specific endpoint responds">
          <SimpleSelect
            value={endpointId ?? "none"}
            onValueChange={(v) => setEndpointId(v === "none" ? null : v)}
            options={[
              { value: "none", label: "Any / manual" },
              ...(endpoints ?? []).map((e) => ({ value: e.id, label: `${e.method} ${e.path}` })),
            ]}
          />
        </Field>
        <Field label="Delivery delay (ms)" hint="e.g. 10000 for a 10s callback">
          <Input type="number" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="Method">
          <SimpleSelect
            value={method}
            onValueChange={(v) => setMethod(v as HttpMethod)}
            options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
          />
        </Field>
        <Field label="Destination URL" required>
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://client.example.com/webhooks/payment"
            className="font-mono"
          />
        </Field>
      </div>

      <Field label="Headers">
        <KeyValueEditor rows={headers} onChange={setHeaders} addLabel="Add header" />
      </Field>

      <Field label="Payload template" hint="Supports {{request.*}}, {{response.*}} and built-in variables">
        <JsonField value={payloadText} onChange={setPayloadText} onValidChange={setPayloadValid} height={220} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Signature">
          <SimpleSelect
            value={signatureType}
            onValueChange={(v) => setSignatureType(v as SignatureType)}
            options={SIGNATURE_TYPES.map((s) => ({ value: s, label: s }))}
          />
        </Field>
        {signatureType !== "NONE" && (
          <Field label="Signing secret" hint="Stored encrypted; leave blank to keep existing">
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" placeholder="••••••••" />
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Retry on failure</p>
            <p className="text-xs text-muted-foreground">Exponential backoff</p>
          </div>
          <Switch checked={retryEnabled} onCheckedChange={setRetryEnabled} />
        </div>
        <Field label="Max retries">
          <Input type="number" value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} disabled={!retryEnabled} />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <p className="text-sm font-medium">Active</p>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={!valid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
