"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Send, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { webhooksApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { EnvironmentPicker, useSystemEnvironments } from "@/components/shared/environment-picker";
import type { Webhook } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveBadge } from "@/components/shared/badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WebhookBuilder, type WebhookBuilderValues } from "@/components/forms/webhook-builder";
import { useToast, useToastError } from "@/components/ui/use-toast";

export default function WebhooksPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [envId, setEnvId] = useState<string>();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; webhook?: Webhook } | null>(null);

  const { data: environments, isLoading: envLoading } = useSystemEnvironments(systemId);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: qk.webhooks(envId ?? "none"),
    queryFn: () => webhooksApi.listForEnvironment(envId!),
    enabled: !!envId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: qk.webhooks(envId ?? "none") });
  }

  const create = useMutation({
    mutationFn: (values: WebhookBuilderValues) => webhooksApi.create(envId!, values),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Webhook created" });
      setDialog(null);
    },
    onError: (e) => toastError(e),
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: WebhookBuilderValues }) =>
      webhooksApi.update(id, values),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Webhook updated" });
      setDialog(null);
    },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: (id: string) => webhooksApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Webhook deleted" });
    },
    onError: (e) => toastError(e),
  });

  const test = useMutation({
    mutationFn: (id: string) => webhooksApi.test(id),
    onSuccess: () => toast({ variant: "success", title: "Test webhook queued" }),
    onError: (e) => toastError(e),
  });

  const noEnvironments = !envLoading && (!environments || environments.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Outbound callbacks fired after an endpoint responds, with delay, signing and retries."
        actions={
          !noEnvironments && (
            <Button onClick={() => setDialog({ mode: "create" })} disabled={!envId}>
              <Plus className="h-4 w-4" /> New webhook
            </Button>
          )
        }
      />

      {noEnvironments ? (
        <EmptyState
          icon={WebhookIcon}
          title="Create an environment first"
          description="Webhooks belong to an environment. Add one in the Environments tab."
        />
      ) : (
        <>
          <EnvironmentPicker environments={environments} value={envId} onChange={setEnvId} isLoading={envLoading} />

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !webhooks || webhooks.length === 0 ? (
            <EmptyState
              icon={WebhookIcon}
              title="No webhooks yet"
              description="Add an outbound webhook to simulate provider callbacks."
              action={
                <Button onClick={() => setDialog({ mode: "create" })}>
                  <Plus className="h-4 w-4" /> Create webhook
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        <Badge variant="secondary">{webhook.triggerEvent}</Badge>
                        {webhook.signatureType !== "NONE" && <Badge variant="outline">{webhook.signatureType}</Badge>}
                        {webhook.delayMs > 0 && <Badge variant="outline">{webhook.delayMs}ms delay</Badge>}
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {webhook.method} {webhook.targetUrl}
                      </p>
                    </div>
                    <ActiveBadge active={webhook.isActive} />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => test.mutate(webhook.id)} aria-label="Test">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDialog({ mode: "edit", webhook })}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete webhook "${webhook.name}"?`)) remove.mutate(webhook.id);
                        }}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit webhook" : "New webhook"}</DialogTitle>
          </DialogHeader>
          {envId && (
            <WebhookBuilder
              environmentId={envId}
              initial={dialog?.webhook}
              submitting={create.isPending || update.isPending}
              submitLabel={dialog?.mode === "edit" ? "Save changes" : "Create webhook"}
              onSubmit={(values) =>
                void (dialog?.mode === "edit" && dialog.webhook
                  ? update.mutateAsync({ id: dialog.webhook.id, values })
                  : create.mutateAsync(values))
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
