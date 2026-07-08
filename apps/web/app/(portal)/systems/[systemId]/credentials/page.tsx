"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { EnvironmentPicker, useSystemEnvironments } from "@/components/shared/environment-picker";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CredentialManager } from "@/components/forms/credential-manager";

export default function CredentialsPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const [envId, setEnvId] = useState<string>();
  const { data: environments, isLoading: envLoading } = useSystemEnvironments(systemId);
  const noEnvironments = !envLoading && (!environments || environments.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentials"
        description="API keys and secrets scoped to each environment. Shown once, rotatable and revocable."
      />

      {noEnvironments ? (
        <EmptyState
          icon={KeyRound}
          title="Create an environment first"
          description="Credentials are issued per environment."
        />
      ) : (
        <>
          <EnvironmentPicker environments={environments} value={envId} onChange={setEnvId} isLoading={envLoading} />
          {envId && <CredentialManager environmentId={envId} />}
        </>
      )}
    </div>
  );
}
