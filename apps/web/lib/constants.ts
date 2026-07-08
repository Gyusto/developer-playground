import type { ConditionOperator, HttpMethod } from "./types";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const satisfies readonly HttpMethod[];

export const SYSTEM_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

export const AUTH_TYPES = ["NONE", "API_KEY", "BASIC", "BEARER", "HMAC"] as const;

export const RESPONSE_MODES = ["STATIC", "RULE_BASED", "RANDOM", "SEQUENCE", "SCRIPTED"] as const;

export const SIGNATURE_TYPES = ["NONE", "HMAC_SHA256", "CUSTOM_HEADER"] as const;

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; needsValue: boolean }[] = [
  { value: "EQUALS", label: "Equals", needsValue: true },
  { value: "NOT_EQUALS", label: "Not equals", needsValue: true },
  { value: "CONTAINS", label: "Contains", needsValue: true },
  { value: "NOT_CONTAINS", label: "Not contains", needsValue: true },
  { value: "STARTS_WITH", label: "Starts with", needsValue: true },
  { value: "ENDS_WITH", label: "Ends with", needsValue: true },
  { value: "GREATER_THAN", label: "Greater than", needsValue: true },
  { value: "GREATER_THAN_OR_EQUAL", label: "Greater than or equal", needsValue: true },
  { value: "LESS_THAN", label: "Less than", needsValue: true },
  { value: "LESS_THAN_OR_EQUAL", label: "Less than or equal", needsValue: true },
  { value: "EXISTS", label: "Exists", needsValue: false },
  { value: "NOT_EXISTS", label: "Not exists", needsValue: false },
  { value: "MATCHES_REGEX", label: "Matches regex", needsValue: true },
  { value: "IN", label: "In (comma list)", needsValue: true },
  { value: "NOT_IN", label: "Not in (comma list)", needsValue: true },
];

export const REQUEST_SOURCE_SUGGESTIONS = [
  "request.body.",
  "request.query.",
  "request.params.",
  "request.headers.",
];

export const TEMPLATE_VARIABLES: { token: string; description: string }[] = [
  { token: "{{uuid}}", description: "Generated UUID" },
  { token: "{{now}}", description: "Current ISO date and time" },
  { token: "{{timestamp}}", description: "Unix timestamp" },
  { token: "{{randomNumber:min:max}}", description: "Random number in range" },
  { token: "{{randomString:length}}", description: "Random string" },
  { token: "{{request.body.field}}", description: "Value from request body" },
  { token: "{{request.query.field}}", description: "Query parameter value" },
  { token: "{{request.params.field}}", description: "Path parameter value" },
  { token: "{{request.headers.field}}", description: "Header value" },
  { token: "{{environment.variableName}}", description: "Environment variable" },
  { token: "{{system.name}}", description: "Integration System name" },
  { token: "{{request.id}}", description: "Internal request log ID" },
];

export const HTTP_STATUS_OPTIONS = [200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];

export function methodColor(method: HttpMethod): string {
  switch (method) {
    case "GET":
      return "text-sky-600 dark:text-sky-400 border-sky-500/40 bg-sky-500/10";
    case "POST":
      return "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    case "PUT":
      return "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10";
    case "PATCH":
      return "text-violet-600 dark:text-violet-400 border-violet-500/40 bg-violet-500/10";
    case "DELETE":
      return "text-red-600 dark:text-red-400 border-red-500/40 bg-red-500/10";
    default:
      return "text-muted-foreground border-border bg-muted";
  }
}

export function statusColor(code?: number): "success" | "warning" | "destructive" | "secondary" {
  if (!code) return "secondary";
  if (code < 300) return "success";
  if (code < 400) return "secondary";
  if (code < 500) return "warning";
  return "destructive";
}
