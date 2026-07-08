"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { systemsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemStatusBadge } from "@/components/shared/badges";
import { SystemTabs } from "@/components/shell/system-tabs";

export default function SystemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { systemId: string };
}) {
  const { systemId } = params;
  const { data: system, isLoading } = useQuery({
    queryKey: qk.system(systemId),
    queryFn: () => systemsApi.get(systemId),
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/systems">
          <ArrowLeft className="h-4 w-4" /> All systems
        </Link>
      </Button>

      <div className="space-y-1">
        {isLoading ? (
          <Skeleton className="h-8 w-56" />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{system?.name ?? "System"}</h1>
            {system && <SystemStatusBadge status={system.status} />}
          </div>
        )}
        {system?.basePath && (
          <p className="font-mono text-sm text-muted-foreground">{system.basePath}</p>
        )}
      </div>

      <SystemTabs systemId={systemId} />

      <div>{children}</div>
    </div>
  );
}
