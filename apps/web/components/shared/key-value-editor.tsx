"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface KeyValueRow {
  key: string;
  value: string;
}

export function recordToRows(record?: Record<string, string> | null): KeyValueRow[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value: String(value) }));
}

export function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.trim()) out[row.key.trim()] = row.value;
  }
  return out;
}

export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  addLabel = "Add row",
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
}) {
  function update(i: number, patch: Partial<KeyValueRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...rows, { key: "", value: "" }]);
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) => update(i, { key: e.target.value })}
            className="flex-1"
          />
          <Input
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) => update(i, { value: e.target.value })}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}
