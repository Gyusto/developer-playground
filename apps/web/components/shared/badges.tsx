import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { methodColor, statusColor } from "@/lib/constants";
import type { HttpMethod, SystemStatus, DeliveryStatus } from "@/lib/types";

export function MethodBadge({ method, className }: { method: HttpMethod; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[52px] justify-center rounded border px-1.5 py-0.5 text-xs font-semibold",
        methodColor(method),
        className,
      )}
    >
      {method}
    </span>
  );
}

export function StatusCodeBadge({ code }: { code?: number }) {
  return <Badge variant={statusColor(code)}>{code ?? "—"}</Badge>;
}

export function SystemStatusBadge({ status }: { status: SystemStatus }) {
  const variant = status === "ACTIVE" ? "success" : status === "ARCHIVED" ? "secondary" : "warning";
  return <Badge variant={variant}>{status}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>;
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const variant =
    status === "SUCCESS"
      ? "success"
      : status === "FAILED"
        ? "destructive"
        : status === "RETRYING"
          ? "warning"
          : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
