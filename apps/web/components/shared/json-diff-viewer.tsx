"use client";

import { useMemo } from "react";
import { prettyJson } from "@/lib/utils";
import { cn } from "@/lib/utils";

type DiffKind = "same" | "added" | "removed";

interface DiffLine {
  kind: DiffKind;
  text: string;
}

/**
 * Lightweight line-based diff between two JSON values.
 * Not a full LCS — good enough to visually compare an expected vs actual payload.
 */
function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const bSet = new Set(bLines);
  const aSet = new Set(aLines);
  const result: DiffLine[] = [];
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    const left = aLines[i];
    const right = bLines[i];
    if (left === right && left !== undefined) {
      result.push({ kind: "same", text: left });
      continue;
    }
    if (left !== undefined && !bSet.has(left)) result.push({ kind: "removed", text: left });
    if (right !== undefined && !aSet.has(right)) result.push({ kind: "added", text: right });
    if (left !== undefined && bSet.has(left) && left !== right && right === undefined) {
      result.push({ kind: "same", text: left });
    }
  }
  return result;
}

export function JsonDiffViewer({
  left,
  right,
  leftLabel = "Expected",
  rightLabel = "Actual",
  className,
}: {
  left: unknown;
  right: unknown;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}) {
  const lines = useMemo(() => diffLines(prettyJson(left), prettyJson(right)), [left, right]);

  return (
    <div className={cn("rounded-md border", className)}>
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="text-destructive">− {leftLabel}</span>
        <span className="text-success">+ {rightLabel}</span>
      </div>
      <pre className="scrollbar-thin max-h-[420px] overflow-auto p-0 text-xs font-mono leading-relaxed">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "px-3 py-0.5 whitespace-pre-wrap",
              line.kind === "added" && "bg-success/10 text-success",
              line.kind === "removed" && "bg-destructive/10 text-destructive",
            )}
          >
            <span className="mr-2 select-none opacity-60">
              {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}
            </span>
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  );
}
