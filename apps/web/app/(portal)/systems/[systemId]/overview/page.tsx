"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Power } from "lucide-react";
import { systemsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useSystemEnvironments } from "@/components/shared/environment-picker";
import type { SystemInput } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemForm } from "@/components/forms/system-form";
import { StatCard } from "@/components/shared/stat-card";
import { formatDateTime } from "@/lib/utils";
import { useToast, useToastError } from "@/components/ui/use-toast";
import { JsonViewer } from "@/components/shared/json-viewer";

export default function OverviewPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [editing, setEditing] = useState(false);

  const { data: system, isLoading } = useQuery({
    queryKey: qk.system(systemId),
    queryFn: () => systemsApi.get(systemId),
  });
  const { data: environments } = useSystemEnvironments(systemId);

  const update = useMutation({
    mutationFn: (values: Partial<SystemInput>) => systemsApi.update(systemId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.system(systemId) });
      queryClient.invalidateQueries({ queryKey: qk.systems });
      toast({ variant: "success", title: "System updated" });
      setEditing(false);
    },
    onError: (e) => toastError(e),
  });

  if (isLoading || !system) {
    return <Skeleton className="h-64 w-full" />;
  }

  const nextStatus = system.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => update.mutate({ status: nextStatus })}
          loading={update.isPending}
        >
          <Power className="h-4 w-4" /> {system.status === "ACTIVE" ? "Deactivate" : "Activate"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => update.mutate({ status: "ARCHIVED" })}
          disabled={system.status === "ARCHIVED"}
        >
          <Archive className="h-4 w-4" /> Archive
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Environments" value={environments?.length ?? 0} />
        <StatCard label="Status" value={system.status} />
        <StatCard label="Version base path" value={system.basePath || "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <DetailRow label="Name" value={system.name} />
          <DetailRow label="Slug" value={`/${system.slug}`} mono />
          <DetailRow label="Description" value={system.description || "—"} />
          <DetailRow label="Created" value={formatDateTime(system.createdAt)} />
          <DetailRow label="Updated" value={formatDateTime(system.updatedAt)} />
          {system.defaultHeaders && Object.keys(system.defaultHeaders).length > 0 && (
            <div className="space-y-1.5">
              <span className="text-muted-foreground">Default headers</span>
              <JsonViewer value={system.defaultHeaders} maxHeight={160} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit system</DialogTitle>
          </DialogHeader>
          <SystemForm
            initial={system}
            submitting={update.isPending}
            onSubmit={(values) => void update.mutateAsync(values)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : undefined}>{value}</span>
    </div>
  );
}
