"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { MonacoJsonEditor } from "./monaco-json-editor";
import { safeParseJson } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Controlled JSON editor bound to a string. Reports validity so parent forms can
 * block submission on malformed JSON. Degrades to Monaco's own loading fallback.
 */
export function JsonField({
  value,
  onChange,
  onValidChange,
  language = "json",
  height = 240,
  className,
  allowEmpty = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (valid: boolean) => void;
  language?: "json" | "javascript";
  height?: number;
  className?: string;
  allowEmpty?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const onValidRef = useRef(onValidChange);
  onValidRef.current = onValidChange;

  useEffect(() => {
    if (language !== "json") {
      setError(null);
      onValidRef.current?.(true);
      return;
    }
    if (!value.trim()) {
      setError(allowEmpty ? null : "Value is required");
      onValidRef.current?.(allowEmpty);
      return;
    }
    const parsed = safeParseJson(value);
    setError(parsed.ok ? null : parsed.error);
    onValidRef.current?.(parsed.ok);
  }, [value, language, allowEmpty]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <MonacoJsonEditor value={value} onChange={onChange} language={language} height={height} />
      {language === "json" && (
        <div className="flex items-center gap-1.5 text-xs">
          {error ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Valid JSON
            </span>
          )}
        </div>
      )}
    </div>
  );
}
