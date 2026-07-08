"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { environmentsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Environment } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/** Fetches a system's environments and keeps a selected one. */
export function useSystemEnvironments(systemId: string) {
  return useQuery({
    queryKey: qk.environments(systemId),
    queryFn: () => environmentsApi.listForSystem(systemId),
  });
}

export function EnvironmentPicker({
  environments,
  value,
  onChange,
  isLoading,
}: {
  environments?: Environment[];
  value?: string;
  onChange: (id: string) => void;
  isLoading?: boolean;
}) {
  // Default to the first environment once loaded.
  useEffect(() => {
    if (!value && environments && environments.length > 0) {
      onChange(environments[0].id);
    }
  }, [value, environments, onChange]);

  if (isLoading) return <Skeleton className="h-9 w-56" />;
  if (!environments || environments.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Label className="text-muted-foreground">Environment</Label>
      <SimpleSelect
        value={value}
        onValueChange={onChange}
        className="w-52"
        options={environments.map((e) => ({ value: e.id, label: e.name }))}
      />
    </div>
  );
}
