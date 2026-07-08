"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Trash2, UserPlus, Users } from "lucide-react";
import { teamApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { inviteSchema, type InviteInput } from "@/lib/schemas";
import { initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/shared/field";
import { Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast, useToastError } from "@/components/ui/use-toast";

const ROLES = ["OWNER", "ADMINISTRATOR", "DEVELOPER", "QA_TESTER", "VIEWER"];

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [inviting, setInviting] = useState(false);

  const { data: members, isLoading } = useQuery({ queryKey: qk.team, queryFn: teamApi.members });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "DEVELOPER" },
  });

  const invite = useMutation({
    mutationFn: (values: InviteInput) => teamApi.invite(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.team });
      toast({ variant: "success", title: "Invitation sent" });
      setInviting(false);
      reset();
    },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.team });
      toast({ variant: "success", title: "Member removed" });
    },
    onError: (e) => toastError(e),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage workspace members and their roles."
        actions={
          <Button onClick={() => setInviting(true)}>
            <UserPlus className="h-4 w-4" /> Invite member
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !members || members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite developers and QA testers to collaborate in this workspace."
          action={
            <Button onClick={() => setInviting(true)}>
              <UserPlus className="h-4 w-4" /> Invite member
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium uppercase text-primary-foreground">
                  {initials(m.name || m.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name || m.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant="secondary">{m.role}</Badge>
                {m.status && <Badge variant="outline">{m.status}</Badge>}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remove ${m.email}?`)) remove.mutate(m.id);
                  }}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => invite.mutate(v))} className="space-y-4">
            <Field label="Email" error={errors.email?.message} required>
              <Input type="email" placeholder="teammate@company.com" {...register("email")} />
            </Field>
            <Field label="Role">
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <SimpleSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={ROLES.map((r) => ({ value: r, label: r.replace("_", " ") }))}
                  />
                )}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviting(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={invite.isPending}>
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
