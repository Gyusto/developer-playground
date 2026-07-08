"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { endpointsApi, systemsApi, webhooksApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { EnvironmentPicker, useSystemEnvironments } from "@/components/shared/environment-picker";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiDocumentationViewer } from "@/components/docs/api-documentation-viewer";

export default function DocumentationPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const [envId, setEnvId] = useState<string>();

  const { data: system } = useQuery({ queryKey: qk.system(systemId), queryFn: () => systemsApi.get(systemId) });
  const { data: environments, isLoading: envLoading } = useSystemEnvironments(systemId);
  const environment = environments?.find((e) => e.id === envId);

  const { data: endpoints, isLoading } = useQuery({
    queryKey: qk.endpoints(envId ?? "none"),
    queryFn: () => endpointsApi.listForEnvironment(envId!),
    enabled: !!envId,
  });

  const { data: webhooks } = useQuery({
    queryKey: qk.webhooks(envId ?? "none"),
    queryFn: () => webhooksApi.listForEnvironment(envId!),
    enabled: !!envId,
  });

  const noEnvironments = !envLoading && (!environments || environments.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation"
        description="Human-readable and OpenAPI-compatible docs generated from your configuration."
      />

      {noEnvironments ? (
        <EmptyState icon={FileText} title="Nothing to document yet" description="Create an environment and endpoints first." />
      ) : (
        <>
          <EnvironmentPicker environments={environments} value={envId} onChange={setEnvId} isLoading={envLoading} />
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ApiDocumentationViewer
              system={system}
              environment={environment}
              endpoints={endpoints ?? []}
              webhooks={webhooks}
            />
          )}
        </>
      )}
    </div>
  );
}
