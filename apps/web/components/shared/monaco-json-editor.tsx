"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy-load Monaco on the client only so SSR (and no-JS) degrade gracefully.
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[160px] items-center justify-center bg-muted/40">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function MonacoJsonEditor({
  value,
  onChange,
  language = "json",
  height = 260,
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  language?: "json" | "javascript";
  height?: number | string;
  readOnly?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={cn("overflow-hidden rounded-md border", className)}>
      <MonacoEditor
        height={height}
        language={language}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          formatOnPaste: true,
          scrollbar: { alwaysConsumeMouseWheel: false },
        }}
      />
    </div>
  );
}
