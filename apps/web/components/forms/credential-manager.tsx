"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { credentialsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { AUTH_TYPES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { ApiCredential } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Field } from "@/components/shared/field";
import { CopyButton } from "@/components/shared/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast, useToastError } from "@/components/ui/use-toast";

export function CredentialManager({ environmentId }: { environmentId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("API_KEY");
  const [reveal, setReveal] = useState<ApiCredential | null>(null);

  const { data: credentials, isLoading } = useQuery({
    queryKey: qk.credentials(environmentId),
    queryFn: () => credentialsApi.listForEnvironment(environmentId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: qk.credentials(environmentId) });
  }

  const create = useMutation({
    mutationFn: () => credentialsApi.create(environmentId, { name, type }),
    onSuccess: (cred) => {
      invalidate();
      setCreating(false);
      setName("");
      if (cred.secret) setReveal(cred);
      toast({ variant: "success", title: "Credential created" });
    },
    onError: (e) => toastError(e),
  });

  const rotate = useMutation({
    mutationFn: (id: string) => credentialsApi.rotate(id),
    onSuccess: (cred) => {
      invalidate();
      if (cred.secret) setReveal(cred);
      toast({ variant: "success", title: "Credential rotated" });
    },
    onError: (e) => toastError(e),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => credentialsApi.revoke(id),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Credential revoked" });
    },
    onError: (e) => toastError(e),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Secrets are shown only once at creation or rotation. Store them securely.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New credential
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !credentials || credentials.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No credentials"
          description="Generate an API key so integration partners can call this environment."
        />
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <Card key={cred.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <ShieldCheck className={cred.revokedAt ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-success"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cred.name}</span>
                    <Badge variant="outline">{cred.type}</Badge>
                    {cred.revokedAt && <Badge variant="destructive">revoked</Badge>}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {cred.keyPrefix ? `${cred.keyPrefix}••••••••` : "••••••••"} · created {formatDateTime(cred.createdAt)}
                  </p>
                </div>
                {!cred.revokedAt && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => rotate.mutate(cred.id)} aria-label="Rotate">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Revoke credential "${cred.name}"? This cannot be undone.`)) revoke.mutate(cred.id);
                      }}
                      aria-label="Revoke"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner integration key" />
            </Field>
            <Field label="Type">
              <SimpleSelect
                value={type}
                onValueChange={setType}
                options={AUTH_TYPES.filter((t) => t !== "NONE").map((t) => ({ value: t, label: t }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!name.trim()}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time reveal dialog */}
      <Dialog open={!!reveal} onOpenChange={(o) => !o && setReveal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Copy your secret now
            </DialogTitle>
            <DialogDescription>
              This is the only time the full secret is shown. It cannot be retrieved again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
              <code className="scrollbar-thin flex-1 overflow-x-auto whitespace-nowrap text-sm">
                {reveal?.secret}
              </code>
            </div>
            <CopyButton value={reveal?.secret ?? ""} label="Copy secret" className="w-full" />
          </div>
          <DialogFooter>
            <Button onClick={() => setReveal(null)}>I&apos;ve saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
