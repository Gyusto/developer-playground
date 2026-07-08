"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus } from "lucide-react";
import { systemsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemStatusBadge } from "@/components/shared/badges";

export default function SystemsPage() {
  const { data: systems, isLoading, isError } = useQuery({
    queryKey: qk.systems,
    queryFn: systemsApi.list,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration Systems"
        description="Mock external platforms such as AzamPay, Selcom, CRDB or an SMS gateway."
        actions={
          <Button asChild>
            <Link href="/systems/new">
              <Plus className="h-4 w-4" /> New system
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Boxes}
          title="Could not load systems"
          description="Check that the Portal Management API is running and reachable."
        />
      ) : !systems || systems.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No integration systems yet"
          description="Create your first system to start building mock endpoints and webhooks."
          action={
            <Button asChild>
              <Link href="/systems/new">
                <Plus className="h-4 w-4" /> Create system
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map((system) => (
            <Link key={system.id} href={`/systems/${system.id}/overview`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{system.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">/{system.slug}</p>
                    </div>
                    <SystemStatusBadge status={system.status} />
                  </div>
                  {system.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {system.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{system.basePath || "—"}</span>
                    <span>{formatDateTime(system.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
