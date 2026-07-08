"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { environmentSchema, type EnvironmentInput } from "@/lib/schemas";
import { slugify } from "@/lib/utils";
import type { Environment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/shared/field";
import {
  KeyValueEditor,
  recordToRows,
  rowsToRecord,
  type KeyValueRow,
} from "@/components/shared/key-value-editor";

export function EnvironmentForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Save environment",
}: {
  initial?: Partial<Environment>;
  onSubmit: (values: EnvironmentInput) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [variables, setVariables] = useState<KeyValueRow[]>(recordToRows(initial?.variables));
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EnvironmentInput>({
    resolver: zodResolver(environmentSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      isActive: initial?.isActive ?? true,
    },
  });

  function submit(values: EnvironmentInput) {
    return onSubmit({ ...values, variables: rowsToRecord(variables) });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="env-name" error={errors.name?.message} required>
          <Input
            id="env-name"
            placeholder="UAT"
            {...register("name", {
              onChange: (e) => {
                if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </Field>
        <Field label="Slug" htmlFor="env-slug" error={errors.slug?.message} required>
          <Input
            id="env-slug"
            placeholder="uat"
            {...register("slug", { onChange: () => setSlugTouched(true) })}
          />
        </Field>
      </div>

      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Accept requests</p>
              <p className="text-xs text-muted-foreground">
                When disabled, the runtime rejects calls to this environment.
              </p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />

      <Field label="Environment variables" hint="Referenced in templates via {{environment.name}}">
        <KeyValueEditor
          rows={variables}
          onChange={setVariables}
          keyPlaceholder="Variable"
          valuePlaceholder="Value"
          addLabel="Add variable"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
