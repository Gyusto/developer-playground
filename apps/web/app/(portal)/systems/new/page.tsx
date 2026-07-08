"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { systemsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { SystemInput } from "@/lib/schemas";
import { PageHeader } from "@/components/shared/page-header";
import { SystemForm } from "@/components/forms/system-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast, useToastError } from "@/components/ui/use-toast";

export default function NewSystemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();

  const mutation = useMutation({
    mutationFn: (values: SystemInput) => systemsApi.create(values),
    onSuccess: (system) => {
      queryClient.invalidateQueries({ queryKey: qk.systems });
      toast({ variant: "success", title: "System created", description: system.name });
      router.push(`/systems/${system.id}/overview`);
    },
    onError: (e) => toastError(e, "Could not create system"),
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/systems">
          <ArrowLeft className="h-4 w-4" /> Back to systems
        </Link>
      </Button>
      <PageHeader title="New Integration System" description="Define the platform you want to simulate." />
      <Card>
        <CardContent className="pt-6">
          <SystemForm
            onSubmit={(values) => void mutation.mutateAsync(values)}
            submitting={mutation.isPending}
            submitLabel="Create system"
          />
        </CardContent>
      </Card>
    </div>
  );
}
