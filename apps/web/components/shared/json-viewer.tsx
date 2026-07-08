"use client";

import { prettyJson } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

export function JsonViewer({
  value,
  className,
  maxHeight = 360,
  copyable = true,
}: {
  value: unknown;
  className?: string;
  maxHeight?: number;
  copyable?: boolean;
}) {
  const text = value === undefined || value === null ? "" : prettyJson(value);

  if (!text) {
    return <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">No content</div>;
  }

  return (
    <div className={cn("relative rounded-md border bg-muted/30", className)}>
      {copyable && (
        <div className="absolute right-2 top-2 z-10">
          <CopyButton value={text} label="" variant="ghost" className="h-7 w-7 p-0" />
        </div>
      )}
      <pre
        className="scrollbar-thin overflow-auto p-3 pr-10 text-xs leading-relaxed font-mono"
        style={{ maxHeight }}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}
