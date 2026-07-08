"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { webhooksApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { WebhookDelivery } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DeliveryStatusBadge, StatusCodeBadge } from "@/components/shared/badges";
import { JsonViewer } from "@/components/shared/json-viewer";
import { useToast, useToastError } from "@/components/ui/use-toast";

export function WebhookDeliveryTimeline({
  deliveries,
  invalidateKey,
  showPayload = false,
}: {
  deliveries: WebhookDelivery[];
  invalidateKey?: readonly unknown[];
  showPayload?: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();

  const retry = useMutation({
    mutationFn: (id: string) => webhooksApi.retryDelivery(id),
    onSuccess: () => {
      if (invalidateKey) queryClient.invalidateQueries({ queryKey: invalidateKey });
      toast({ variant: "success", title: "Retry queued" });
    },
    onError: (e) => toastError(e),
  });

  if (deliveries.length === 0) {
    return <p className="text-sm text-muted-foreground">No webhook deliveries.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l pl-5">
      {deliveries.map((d) => (
        <li key={d.id} className="relative">
          <span className="absolute -left-[1.42rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Attempt {d.attempt}</span>
            <DeliveryStatusBadge status={d.status} />
            {d.httpStatus != null && <StatusCodeBadge code={d.httpStatus} />}
            {typeof d.responseTimeMs === "number" && (
              <span className="text-xs text-muted-foreground">{d.responseTimeMs} ms</span>
            )}
            {d.status === "FAILED" && (
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => retry.mutate(d.id)}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {d.method ?? "POST"} {d.targetUrl}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
            <span>{formatDateTime(d.createdAt)}</span>
            {d.nextRetryAt && <span>Next retry: {formatDateTime(d.nextRetryAt)}</span>}
            {d.event && <span>Event: {d.event}</span>}
          </div>
          {d.error && <p className="mt-1 text-xs text-destructive">{d.error}</p>}
          {showPayload && d.requestBody != null && (
            <div className="mt-2">
              <JsonViewer value={d.requestBody} maxHeight={180} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
