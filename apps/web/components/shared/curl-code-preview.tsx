"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "./copy-button";

export interface CurlConfig {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

function bodyString(body: unknown): string | null {
  if (body === undefined || body === null || body === "") return null;
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

function toCurl({ method, url, headers = {}, body }: CurlConfig): string {
  const parts = [`curl -X ${method.toUpperCase()} '${url}'`];
  for (const [k, v] of Object.entries(headers)) parts.push(`  -H '${k}: ${v}'`);
  const b = bodyString(body);
  if (b) parts.push(`  -d '${b.replace(/'/g, "'\\''")}'`);
  return parts.join(" \\\n");
}

function toJavaScript({ method, url, headers = {}, body }: CurlConfig): string {
  const b = bodyString(body);
  const init: Record<string, unknown> = { method: method.toUpperCase(), headers };
  const initStr = JSON.stringify(init, null, 2).replace(
    /}$/,
    b ? `,\n  "body": ${JSON.stringify(b)}\n}` : "}",
  );
  return `const res = await fetch(${JSON.stringify(url)}, ${initStr});\nconst data = await res.json();\nconsole.log(data);`;
}

function toPython({ method, url, headers = {}, body }: CurlConfig): string {
  const b = bodyString(body);
  const lines = [
    "import requests",
    "",
    `url = ${JSON.stringify(url)}`,
    `headers = ${JSON.stringify(headers, null, 4)}`,
  ];
  if (b) lines.push(`payload = ${b}`);
  lines.push(
    `resp = requests.request(${JSON.stringify(method.toUpperCase())}, url, headers=headers${b ? ", json=payload" : ""})`,
    "print(resp.status_code, resp.json())",
  );
  return lines.join("\n");
}

const GENERATORS: { key: string; label: string; fn: (c: CurlConfig) => string }[] = [
  { key: "curl", label: "cURL", fn: toCurl },
  { key: "javascript", label: "JavaScript", fn: toJavaScript },
  { key: "python", label: "Python", fn: toPython },
];

export function CurlCodePreview({ config }: { config: CurlConfig }) {
  const [tab, setTab] = useState("curl");
  const snippets = useMemo(
    () => Object.fromEntries(GENERATORS.map((g) => [g.key, g.fn(config)])),
    [config],
  );

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        {GENERATORS.map((g) => (
          <TabsTrigger key={g.key} value={g.key}>
            {g.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {GENERATORS.map((g) => (
        <TabsContent key={g.key} value={g.key} className="mt-3">
          <div className="relative rounded-md border bg-muted/40">
            <div className="absolute right-2 top-2 z-10">
              <CopyButton value={snippets[g.key]} label="Copy" variant="ghost" />
            </div>
            <pre className="scrollbar-thin overflow-auto p-3 pr-16 text-xs font-mono leading-relaxed">
              <code>{snippets[g.key]}</code>
            </pre>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
