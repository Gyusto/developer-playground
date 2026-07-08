"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { rulesApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { CONDITION_OPERATORS } from "@/lib/constants";
import type { ConditionOperator, ResponseRule, RuleCondition } from "@/lib/types";
import { prettyJson, safeParseJson } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusCodeBadge } from "@/components/shared/badges";
import { Field } from "@/components/shared/field";
import { JsonField } from "@/components/shared/json-field";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast, useToastError } from "@/components/ui/use-toast";

interface RuleFormState {
  id?: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  statusCode: number;
  bodyText: string;
  isActive: boolean;
}

function toFormState(rule?: ResponseRule): RuleFormState {
  return {
    id: rule?.id,
    name: rule?.name ?? "",
    priority: rule?.priority ?? 10,
    conditions: rule?.conditions ?? [],
    statusCode: rule?.response?.statusCode ?? 200,
    bodyText: rule?.response?.body ? prettyJson(rule.response.body) : "{\n  \n}",
    isActive: rule?.isActive ?? true,
  };
}

function coerceValue(operator: ConditionOperator, raw?: string): RuleCondition["value"] {
  if (raw === undefined) return undefined;
  if (operator === "IN" || operator === "NOT_IN") {
    return raw.split(",").map((v) => v.trim()).filter(Boolean);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

export function ResponseRuleBuilder({ endpointId }: { endpointId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [editing, setEditing] = useState<RuleFormState | null>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: qk.rules(endpointId),
    queryFn: () => rulesApi.listForEndpoint(endpointId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: qk.rules(endpointId) });
  }

  const save = useMutation({
    mutationFn: (state: RuleFormState) => {
      const parsed = safeParseJson(state.bodyText);
      const body = parsed.ok ? parsed.value : {};
      const payload = {
        name: state.name,
        priority: state.priority,
        conditions: state.conditions,
        response: { statusCode: state.statusCode, body },
        isActive: state.isActive,
      };
      return state.id
        ? rulesApi.update(state.id, payload)
        : rulesApi.create(endpointId, payload);
    },
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Rule saved" });
      setEditing(null);
    },
    onError: (e) => toastError(e),
  });

  const remove = useMutation({
    mutationFn: (id: string) => rulesApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Rule deleted" });
    },
    onError: (e) => toastError(e),
  });

  const sorted = [...(rules ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Rules are evaluated by ascending priority. The first matching active rule wins.
        </p>
        <Button size="sm" onClick={() => setEditing(toFormState())}>
          <Plus className="h-4 w-4" /> Add rule
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={GripVertical}
          title="No response rules"
          description="Add rules to return different responses based on request data. Without rules, the default response is used."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">#{rule.priority}</Badge>
                    <span className="font-medium">{rule.name}</span>
                    <StatusCodeBadge code={rule.response?.statusCode} />
                    {!rule.isActive && <Badge variant="outline">disabled</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rule.conditions.length === 0
                      ? "No conditions (fallback / catch-all)"
                      : rule.conditions
                          .map((c) => `${c.source} ${c.operator} ${formatValue(c.value)}`)
                          .join("  AND  ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(toFormState(rule))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete rule "${rule.name}"?`)) remove.mutate(rule.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <RuleDialog
          key={editing.id ?? "new"}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(s) => save.mutate(s)}
          submitting={save.isPending}
        />
      )}
    </div>
  );
}

function formatValue(value: RuleCondition["value"]): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value ?? "");
}

function RuleDialog({
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  initial: RuleFormState;
  onClose: () => void;
  onSubmit: (state: RuleFormState) => void;
  submitting?: boolean;
}) {
  const [form, setForm] = useState<RuleFormState>(initial);
  const [bodyValid, setBodyValid] = useState(true);

  function patch(p: Partial<RuleFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }
  function updateCondition(i: number, p: Partial<RuleCondition>) {
    patch({ conditions: form.conditions.map((c, idx) => (idx === i ? { ...c, ...p } : c)) });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit rule" : "New response rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" className="sm:col-span-2" required>
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Insufficient balance" />
            </Field>
            <Field label="Priority" hint="Lower = evaluated first">
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => patch({ priority: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conditions</span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() =>
                  patch({
                    conditions: [
                      ...form.conditions,
                      { source: "request.body.", operator: "EQUALS", value: "" },
                    ],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add condition
              </Button>
            </div>
            {form.conditions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No conditions means this rule always matches (use it as a catch-all with a high priority number).
              </p>
            )}
            {form.conditions.map((c, i) => {
              const op = CONDITION_OPERATORS.find((o) => o.value === c.operator);
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    value={c.source}
                    placeholder="request.body.amount"
                    className="flex-1"
                    onChange={(e) => updateCondition(i, { source: e.target.value })}
                  />
                  <SimpleSelect
                    className="w-52"
                    value={c.operator}
                    onValueChange={(v) => updateCondition(i, { operator: v as ConditionOperator })}
                    options={CONDITION_OPERATORS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                  {op?.needsValue && (
                    <Input
                      value={Array.isArray(c.value) ? c.value.join(", ") : String(c.value ?? "")}
                      placeholder="value"
                      className="w-40 flex-1"
                      onChange={(e) => updateCondition(i, { value: coerceValue(c.operator, e.target.value) })}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => patch({ conditions: form.conditions.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Response status" hint="HTTP status for this rule">
              <Input
                type="number"
                value={form.statusCode}
                onChange={(e) => patch({ statusCode: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Response body" hint="Supports template variables like {{uuid}} and {{request.body.field}}">
            <JsonField
              value={form.bodyText}
              onChange={(v) => patch({ bodyText: v })}
              onValidChange={setBodyValid}
              height={200}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            loading={submitting}
            disabled={!form.name.trim() || !bodyValid}
          >
            Save rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
