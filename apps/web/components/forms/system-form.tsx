"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { systemSchema, type SystemInput } from "@/lib/schemas";
import { SYSTEM_STATUSES } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import type { IntegrationSystem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import {
  KeyValueEditor,
  recordToRows,
  rowsToRecord,
  type KeyValueRow,
} from "@/components/shared/key-value-editor";

export function SystemForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Save system",
}: {
  initial?: Partial<IntegrationSystem>;
  onSubmit: (values: SystemInput) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [headers, setHeaders] = useState<KeyValueRow[]>(recordToRows(initial?.defaultHeaders));
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<SystemInput>({
    resolver: zodResolver(systemSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      basePath: initial?.basePath ?? "",
      status: initial?.status ?? "ACTIVE",
    },
  });

  function submit(values: SystemInput) {
    return onSubmit({ ...values, defaultHeaders: rowsToRecord(headers) });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input
            id="name"
            placeholder="AzamPay Checkout Sandbox"
            {...register("name", {
              onChange: (e) => {
                if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: true });
              },
            })}
          />
        </Field>
        <Field
          label="Slug"
          htmlFor="slug"
          error={errors.slug?.message}
          hint="URL-safe unique identifier"
          required
        >
          <Input
            id="slug"
            placeholder="azampay-checkout"
            {...register("slug", { onChange: () => setSlugTouched(true) })}
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea
          id="description"
          placeholder="Mock checkout and payment callback APIs for AzamPay integration testing."
          {...register("description")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Base path" htmlFor="basePath" error={errors.basePath?.message} hint="e.g. /azampay">
          <Input id="basePath" placeholder="/azampay" {...register("basePath")} />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SimpleSelect
                value={field.value}
                onValueChange={field.onChange}
                options={SYSTEM_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            )}
          />
        </Field>
      </div>

      <Field label="Default response headers" hint="Returned by default across this system's endpoints">
        <KeyValueEditor
          rows={headers}
          onChange={setHeaders}
          keyPlaceholder="Header"
          valuePlaceholder="Value"
          addLabel="Add header"
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
