"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface ParamRow {
  name: string;
  required: boolean;
  type: string;
  example?: string;
  allowedValues?: string[];
}

export function ParamRowsEditor({
  rows,
  onChange,
  showExample,
  showAllowedValues,
  namePlaceholder = "name",
  emptyHint,
}: {
  rows: ParamRow[];
  onChange: (rows: ParamRow[]) => void;
  showExample?: boolean;
  showAllowedValues?: boolean;
  namePlaceholder?: string;
  emptyHint?: string;
}) {
  function update(i: number, patch: Partial<ParamRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...rows, { name: "", required: false, type: "string" }]);
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && emptyHint && (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <Input
            value={row.name}
            placeholder={namePlaceholder}
            onChange={(e) => update(i, { name: e.target.value })}
            className="w-40 flex-1"
          />
          <Input
            value={row.type}
            placeholder="type"
            onChange={(e) => update(i, { type: e.target.value })}
            className="w-24"
          />
          {showExample && (
            <Input
              value={row.example ?? ""}
              placeholder="example"
              onChange={(e) => update(i, { example: e.target.value })}
              className="w-36 flex-1"
            />
          )}
          {showAllowedValues && (
            <Input
              value={(row.allowedValues ?? []).join(", ")}
              placeholder="allowed values (comma)"
              onChange={(e) =>
                update(i, {
                  allowedValues: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
              className="w-44 flex-1"
            />
          )}
          <div className="flex items-center gap-1.5">
            <Switch
              checked={row.required}
              onCheckedChange={(v) => update(i, { required: v })}
              id={`req-${i}`}
            />
            <Label htmlFor={`req-${i}`} className="text-xs text-muted-foreground">
              required
            </Label>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Add parameter
      </Button>
    </div>
  );
}
