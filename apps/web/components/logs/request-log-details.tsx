"use client";

import { useQuery } from "@tanstack/react-query";
import { logsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import type { RequestLog } from "@/lib/types";
import { MethodBadge, StatusCodeBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/shared/json-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { WebhookDeliveryTimeline } from "./webhook-delivery-timeline";

export function RequestLogDetails({ logId, fallback }: { logId: string; fallback?: RequestLog }) {
  const { data, isLoading } = useQuery({
    queryKey: qk.requestLog(logId),
    queryFn: () => logsApi.requestLog(logId),
    initialData: fallback,
  });

  if (isLoading && !data) return <Skeleton className="h-64 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">Log not found.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={data.method} />
        <code className="font-mono text-sm">{data.path}</code>
        <StatusCodeBadge code={data.statusCode} />
        {typeof data.responseTimeMs === "number" && (
          <Badge variant="outline">{data.responseTimeMs} ms</Badge>
        )}
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <Meta label="Timestamp" value={formatDateTime(data.createdAt)} />
        <Meta label="Source IP" value={data.sourceIp ?? "—"} />
        <Meta label="Correlation ID" value={data.correlationId ?? "—"} mono />
        <Meta label="Endpoint" value={data.endpointName ?? "—"} />
        {data.matchedRuleName && <Meta label="Matched rule" value={data.matchedRuleName} />}
      </div>

      <Panel title="Request headers"><JsonViewer value={data.requestHeaders} maxHeight={160} /></Panel>
      {data.requestQuery && Object.keys(data.requestQuery).length > 0 && (
        <Panel title="Query parameters"><JsonViewer value={data.requestQuery} maxHeight={140} /></Panel>
      )}
      {data.requestParams && Object.keys(data.requestParams).length > 0 && (
        <Panel title="Path parameters"><JsonViewer value={data.requestParams} maxHeight={140} /></Panel>
      )}
      <Panel title="Request body"><JsonViewer value={data.requestBody} maxHeight={220} /></Panel>
      <Panel title="Response headers"><JsonViewer value={data.responseHeaders} maxHeight={160} /></Panel>
      <Panel title="Response body"><JsonViewer value={data.responseBody} maxHeight={240} /></Panel>

      <Panel title="Triggered webhook deliveries">
        <WebhookDeliveryTimeline
          deliveries={data.webhookDeliveries ?? []}
          invalidateKey={qk.requestLog(logId)}
        />
      </Panel>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0">{label}</span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}
