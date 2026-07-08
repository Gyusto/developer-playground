// Domain types mirroring spec sections 3, 5, 6, 8, 11.
// Kept self-contained (no workspace package import) so the web app compiles independently.

export type SystemStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthType = "NONE" | "API_KEY" | "BASIC" | "BEARER" | "HMAC";
export type ResponseMode = "STATIC" | "RULE_BASED" | "RANDOM" | "SEQUENCE" | "SCRIPTED";
export type SignatureType = "NONE" | "HMAC_SHA256" | "CUSTOM_HEADER";

export type ConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "STARTS_WITH"
  | "ENDS_WITH"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "EXISTS"
  | "NOT_EXISTS"
  | "MATCHES_REGEX"
  | "IN"
  | "NOT_IN";

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  workspaceId?: string;
  workspaceName?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export interface IntegrationSystem {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  basePath?: string | null;
  status: SystemStatus;
  defaultHeaders?: Record<string, string> | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  environmentCount?: number;
  endpointCount?: number;
}

export interface Environment {
  id: string;
  integrationSystemId: string;
  name: string;
  slug: string;
  baseUrl?: string | null;
  isActive: boolean;
  variables?: Record<string, string> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeaderParam {
  name: string;
  required: boolean;
  type: string;
  example?: string;
}

export interface QueryParam {
  name: string;
  required: boolean;
  type: string;
  allowedValues?: string[];
}

export interface PathParam {
  name: string;
  required: boolean;
  type: string;
}

export interface ApiEndpoint {
  id: string;
  integrationSystemId?: string;
  environmentId: string;
  name: string;
  method: HttpMethod;
  path: string;
  description?: string | null;
  authType: AuthType;
  headers?: HeaderParam[];
  queryParams?: QueryParam[];
  pathParams?: PathParam[];
  requestSchema?: unknown;
  responseMode: ResponseMode;
  defaultStatusCode: number;
  defaultHeaders?: Record<string, string> | null;
  defaultResponseBody?: unknown;
  delayMs: number;
  timeoutEnabled: boolean;
  isActive: boolean;
  version: number;
  webhookId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RuleCondition {
  source: string;
  operator: ConditionOperator;
  value?: string | number | boolean | string[];
}

export interface RuleResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ResponseRule {
  id: string;
  endpointId: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  response: RuleResponse;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Webhook {
  id: string;
  integrationSystemId?: string;
  environmentId: string;
  endpointId?: string | null;
  name: string;
  targetUrl: string;
  method: HttpMethod;
  headers?: Record<string, string> | null;
  payloadTemplate?: unknown;
  triggerEvent: string;
  delayMs: number;
  retryEnabled: boolean;
  maxRetries: number;
  signatureType: SignatureType;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiCredential {
  id: string;
  environmentId: string;
  name: string;
  type: AuthType;
  keyPrefix?: string;
  // Present ONLY in the create/rotate response — shown once.
  secret?: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string;
}

export interface RequestLog {
  id: string;
  integrationSystemId?: string;
  systemName?: string;
  environmentId?: string;
  environmentName?: string;
  endpointId?: string;
  endpointName?: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  responseTimeMs?: number;
  sourceIp?: string;
  correlationId?: string;
  matchedRuleId?: string | null;
  matchedRuleName?: string | null;
  requestHeaders?: Record<string, string>;
  requestQuery?: Record<string, unknown>;
  requestParams?: Record<string, unknown>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  webhookDeliveries?: WebhookDelivery[];
  createdAt?: string;
}

export type DeliveryStatus = "PENDING" | "SUCCESS" | "FAILED" | "RETRYING";

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  webhookName?: string;
  event?: string;
  targetUrl: string;
  method?: HttpMethod;
  httpStatus?: number | null;
  attempt: number;
  maxRetries?: number;
  status: DeliveryStatus;
  responseTimeMs?: number | null;
  nextRetryAt?: string | null;
  requestBody?: unknown;
  requestHeaders?: Record<string, string>;
  responseBody?: unknown;
  error?: string | null;
  createdAt?: string;
}

export interface InboundWebhookLog {
  id: string;
  environmentId?: string;
  systemName?: string;
  environmentName?: string;
  webhookSlug?: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
  sourceIp?: string;
  contentType?: string;
  signatureValid?: boolean | null;
  status?: string;
  event?: string | null;
  reference?: string | null;
  receivedAt?: string;
  createdAt?: string;
}

export interface DashboardMetrics {
  totalSystems: number;
  activeEndpoints: number;
  requestsToday: number;
  successfulRequests: number;
  failedRequests: number;
  webhookSuccessRate: number;
  failedWebhookDeliveries: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: string;
  invitedAt?: string;
  status?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
