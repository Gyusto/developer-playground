"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "overview", label: "Overview" },
  { slug: "environments", label: "Environments" },
  { slug: "endpoints", label: "Endpoints" },
  { slug: "webhooks", label: "Webhooks" },
  { slug: "credentials", label: "Credentials" },
  { slug: "logs", label: "Logs" },
  { slug: "documentation", label: "Documentation" },
];

export function SystemTabs({ systemId }: { systemId: string }) {
  const pathname = usePathname();
  return (
    <div className="scrollbar-thin -mb-px flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const href = `/systems/${systemId}/${tab.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
