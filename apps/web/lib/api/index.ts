import { apiFetch } from "../api-client";
import type {
  ApiCredential,
  ApiEndpoint,
  DashboardMetrics,
  Environment,
  InboundWebhookLog,
  IntegrationSystem,
  RequestLog,
  ResponseRule,
  User,
  Webhook,
  WebhookDelivery,
  WorkspaceMember,
} from "../types";

// ---- Auth ----
export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    }),
  forgotPassword: (email: string) =>
    apiFetch<{ sent: boolean }>("/api/v1/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: { email },
    }),
  me: () => apiFetch<User>("/api/v1/auth/me"),
};

// ---- Dashboard ----
export const dashboardApi = {
  metrics: () => apiFetch<DashboardMetrics>("/api/v1/dashboard/metrics"),
};

// ---- Integration Systems ----
export const systemsApi = {
  list: () => apiFetch<IntegrationSystem[]>("/api/v1/integration-systems"),
  get: (id: string) => apiFetch<IntegrationSystem>(`/api/v1/integration-systems/${id}`),
  create: (body: Partial<IntegrationSystem>) =>
    apiFetch<IntegrationSystem>("/api/v1/integration-systems", { method: "POST", body }),
  update: (id: string, body: Partial<IntegrationSystem>) =>
    apiFetch<IntegrationSystem>(`/api/v1/integration-systems/${id}`, { method: "PATCH", body }),
  remove: (id: string) =>
    apiFetch<void>(`/api/v1/integration-systems/${id}`, { method: "DELETE" }),
};

// ---- Environments ----
export const environmentsApi = {
  listForSystem: (systemId: string) =>
    apiFetch<Environment[]>(`/api/v1/integration-systems/${systemId}/environments`),
  get: (id: string) => apiFetch<Environment>(`/api/v1/environments/${id}`),
  create: (systemId: string, body: Partial<Environment>) =>
    apiFetch<Environment>(`/api/v1/integration-systems/${systemId}/environments`, {
      method: "POST",
      body,
    }),
  update: (id: string, body: Partial<Environment>) =>
    apiFetch<Environment>(`/api/v1/environments/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/api/v1/environments/${id}`, { method: "DELETE" }),
};

// ---- Endpoints ----
export const endpointsApi = {
  listForEnvironment: (environmentId: string) =>
    apiFetch<ApiEndpoint[]>(`/api/v1/environments/${environmentId}/endpoints`),
  get: (id: string) => apiFetch<ApiEndpoint>(`/api/v1/endpoints/${id}`),
  create: (environmentId: string, body: Partial<ApiEndpoint>) =>
    apiFetch<ApiEndpoint>(`/api/v1/environments/${environmentId}/endpoints`, {
      method: "POST",
      body,
    }),
  update: (id: string, body: Partial<ApiEndpoint>) =>
    apiFetch<ApiEndpoint>(`/api/v1/endpoints/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/api/v1/endpoints/${id}`, { method: "DELETE" }),
  clone: (id: string) => apiFetch<ApiEndpoint>(`/api/v1/endpoints/${id}/clone`, { method: "POST" }),
  test: (id: string, body: unknown) =>
    apiFetch<TestEndpointResult>(`/api/v1/endpoints/${id}/test`, { method: "POST", body }),
};

export interface TestEndpointResult {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
  matchedRuleName?: string | null;
  responseTimeMs?: number;
}

// ---- Response Rules ----
export const rulesApi = {
  listForEndpoint: (endpointId: string) =>
    apiFetch<ResponseRule[]>(`/api/v1/endpoints/${endpointId}/response-rules`),
  create: (endpointId: string, body: Partial<ResponseRule>) =>
    apiFetch<ResponseRule>(`/api/v1/endpoints/${endpointId}/response-rules`, {
      method: "POST",
      body,
    }),
  update: (id: string, body: Partial<ResponseRule>) =>
    apiFetch<ResponseRule>(`/api/v1/response-rules/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/api/v1/response-rules/${id}`, { method: "DELETE" }),
};

// ---- Webhooks ----
export const webhooksApi = {
  listForEnvironment: (environmentId: string) =>
    apiFetch<Webhook[]>(`/api/v1/environments/${environmentId}/webhooks`),
  get: (id: string) => apiFetch<Webhook>(`/api/v1/webhooks/${id}`),
  create: (environmentId: string, body: Partial<Webhook>) =>
    apiFetch<Webhook>(`/api/v1/environments/${environmentId}/webhooks`, { method: "POST", body }),
  update: (id: string, body: Partial<Webhook>) =>
    apiFetch<Webhook>(`/api/v1/webhooks/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/api/v1/webhooks/${id}`, { method: "DELETE" }),
  test: (id: string, body?: unknown) =>
    apiFetch<WebhookDelivery>(`/api/v1/webhooks/${id}/test`, { method: "POST", body }),
  retryDelivery: (deliveryId: string) =>
    apiFetch<WebhookDelivery>(`/api/v1/webhook-deliveries/${deliveryId}/retry`, { method: "POST" }),
};

// ---- Logs ----
export interface LogQuery {
  systemId?: string;
  environmentId?: string;
  endpointId?: string;
  status?: string;
  statusCode?: number;
  method?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const logsApi = {
  requestLogs: (query?: LogQuery) =>
    apiFetch<RequestLog[]>("/api/v1/request-logs", { query: query as never }),
  requestLog: (id: string) => apiFetch<RequestLog>(`/api/v1/request-logs/${id}`),
  webhookDeliveries: (query?: LogQuery) =>
    apiFetch<WebhookDelivery[]>("/api/v1/webhook-deliveries", { query: query as never }),
  webhookDelivery: (id: string) => apiFetch<WebhookDelivery>(`/api/v1/webhook-deliveries/${id}`),
  inboundWebhookLogs: (query?: LogQuery) =>
    apiFetch<InboundWebhookLog[]>("/api/v1/inbound-webhook-logs", { query: query as never }),
  inboundWebhookLog: (id: string) =>
    apiFetch<InboundWebhookLog>(`/api/v1/inbound-webhook-logs/${id}`),
  replayInbound: (id: string) =>
    apiFetch<InboundWebhookLog>(`/api/v1/inbound-webhook-logs/${id}/replay`, { method: "POST" }),
};

// ---- Credentials ----
export const credentialsApi = {
  listForEnvironment: (environmentId: string) =>
    apiFetch<ApiCredential[]>(`/api/v1/environments/${environmentId}/credentials`),
  create: (environmentId: string, body: { name: string; type: string }) =>
    apiFetch<ApiCredential>(`/api/v1/environments/${environmentId}/credentials`, {
      method: "POST",
      body,
    }),
  rotate: (id: string) => apiFetch<ApiCredential>(`/api/v1/credentials/${id}/rotate`, { method: "POST" }),
  revoke: (id: string) => apiFetch<void>(`/api/v1/credentials/${id}`, { method: "DELETE" }),
};

// ---- Team ----
export const teamApi = {
  members: () => apiFetch<WorkspaceMember[]>("/api/v1/workspace/members"),
  invite: (body: { email: string; role: string }) =>
    apiFetch<WorkspaceMember>("/api/v1/workspace/members", { method: "POST", body }),
  remove: (id: string) => apiFetch<void>(`/api/v1/workspace/members/${id}`, { method: "DELETE" }),
};
