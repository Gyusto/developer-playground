"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2, Zap } from "lucide-react";
import { endpointsApi, systemsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { EnvironmentPicker, useSystemEnvironments } from "@/components/shared/environment-picker";
import type { ApiEndpoint } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodBadge, ActiveBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";
import { EndpointBuilder } from "@/components/forms/endpoint-builder";
import { useToast, useToastError } from "@/components/ui/use-toast";

export default function EndpointsPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [envId, setEnvId] = useState<string>();
  const [builder, setBuilder] = useState<{ endpoint?: ApiEndpoint } | null>(null);

  const { data: system } = useQuery({ queryKey: qk.system(systemId), queryFn: () => systemsApi.get(systemId) });
  const { data: environments, isLoading: envLoading } = useSystemEnvironments(systemId);
  const environment = environments?.find((e) => e.id === envId);

  const { data: endpoints, isLoading } = useQuery({
    queryKey: qk.endpoints(envId ?? "none"),
    queryFn: () => endpointsApi.listForEnvironment(envId!),
    enabled: !!envId,
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpointsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.endpoints(envId ?? "none") });
      toast({ variant: "success", title: "Endpoint deleted" });
    },
    onError: (e) => toastError(e),
  });

  const clone = useMutation({
    mutationFn: (id: string) => endpointsApi.clone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.endpoints(envId ?? "none") });
      toast({ variant: "success", title: "Endpoint cloned" });
    },
    onError: (e) => toastError(e),
  });

  if (builder && envId) {
    return (
      <EndpointBuilder
        environmentId={envId}
        environment={environment}
        system={system}
        endpoint={builder.endpoint}
        onDone={() => {
          setBuilder(null);
          queryClient.invalidateQueries({ queryKey: qk.endpoints(envId) });
        }}
      />
    );
  }

  const noEnvironments = !envLoading && (!environments || environments.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints"
        description="Configurable mock endpoints with rule-based, static, delayed or timeout responses."
        actions={
          !noEnvironments && (
            <Button onClick={() => setBuilder({})} disabled={!envId}>
              <Plus className="h-4 w-4" /> New endpoint
            </Button>
          )
        }
      />

      {noEnvironments ? (
        <EmptyState
          icon={Zap}
          title="Create an environment first"
          description="Endpoints belong to an environment. Add one in the Environments tab."
        />
      ) : (
        <>
          <EnvironmentPicker
            environments={environments}
            value={envId}
            onChange={setEnvId}
            isLoading={envLoading}
          />

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !endpoints || endpoints.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No endpoints yet"
              description="Build your first mock endpoint for this environment."
              action={
                <Button onClick={() => setBuilder({})}>
                  <Plus className="h-4 w-4" /> Create endpoint
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {endpoints.map((endpoint) => (
                <Card key={endpoint.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <MethodBadge method={endpoint.method} />
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setBuilder({ endpoint })}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{endpoint.name}</span>
                        <Badge variant="outline">{endpoint.responseMode}</Badge>
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground">{endpoint.path}</p>
                    </button>
                    <ActiveBadge active={endpoint.isActive} />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => clone.mutate(endpoint.id)} aria-label="Clone">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete endpoint "${endpoint.name}"?`)) remove.mutate(endpoint.id);
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
    </div>
  );
}
