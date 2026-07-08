"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { environmentsApi, systemsApi } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useSystemEnvironments } from "@/components/shared/environment-picker";
import type { Environment } from "@/lib/types";
import type { EnvironmentInput } from "@/lib/schemas";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EnvironmentForm } from "@/components/forms/environment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveBadge } from "@/components/shared/badges";
import { CopyButton } from "@/components/shared/copy-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast, useToastError } from "@/components/ui/use-toast";

export default function EnvironmentsPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; env?: Environment } | null>(null);

  const { data: system } = useQuery({ queryKey: qk.system(systemId), queryFn: () => systemsApi.get(systemId) });
  const { data: environments, isLoading } = useSystemEnvironments(systemId);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: qk.environments(systemId) });
  }

  const create = useMutation({
    mutationFn: (values: EnvironmentInput) => environmentsApi.create(systemId, values),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Environment created" });
      setDialog(null);
    },
    onError: (e) => toastError(e),
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EnvironmentInput }) =>
      environmentsApi.update(id, values),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Environment updated" });
      setDialog(null);
    },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: (id: string) => environmentsApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Environment deleted" });
    },
    onError: (e) => toastError(e),
  });

  function baseUrl(env: Environment) {
    if (env.baseUrl) return env.baseUrl;
    return `${API_BASE_URL}/api/runtime/workspace/${system?.slug ?? "system"}/${env.slug}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environments"
        description="Development, QA, UAT or Sandbox targets. Each has its own runtime base URL."
        actions={
          <Button onClick={() => setDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" /> New environment
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !environments || environments.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No environments yet"
          description="Add an environment to generate a sandbox base URL and issue credentials."
          action={
            <Button onClick={() => setDialog({ mode: "create" })}>
              <Plus className="h-4 w-4" /> Create environment
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {environments.map((env) => (
            <Card key={env.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{env.name}</h3>
                    <p className="text-xs text-muted-foreground">/{env.slug}</p>
                  </div>
                  <ActiveBadge active={env.isActive} />
                </div>

                <div className="rounded-md border bg-muted/40 p-2">
                  <p className="mb-1 text-xs text-muted-foreground">Runtime base URL</p>
                  <div className="flex items-center gap-2">
                    <code className="scrollbar-thin flex-1 overflow-x-auto whitespace-nowrap text-xs">
                      {baseUrl(env)}
                    </code>
                    <CopyButton value={baseUrl(env)} label="" variant="ghost" className="h-7 w-7 p-0" />
                  </div>
                </div>

                {env.variables && Object.keys(env.variables).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(env.variables).length} variable(s)
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setDialog({ mode: "edit", env })}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <CopyButton
                    value={baseUrl(env)}
                    label="Copy URL"
                    size="sm"
                    variant="outline"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete environment "${env.name}"?`)) remove.mutate(env.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit environment" : "New environment"}</DialogTitle>
          </DialogHeader>
          <EnvironmentForm
            initial={dialog?.env}
            submitting={create.isPending || update.isPending}
            submitLabel={dialog?.mode === "edit" ? "Save changes" : "Create environment"}
            onSubmit={(values) =>
              void (dialog?.mode === "edit" && dialog.env
                ? update.mutateAsync({ id: dialog.env.id, values })
                : create.mutateAsync(values))
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
