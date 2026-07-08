import { z } from "zod";
import {
  AUTH_TYPES,
  HTTP_METHODS,
  RESPONSE_MODES,
  SIGNATURE_TYPES,
  SYSTEM_STATUSES,
} from "./constants";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  workspaceName: z.string().max(120).optional().or(z.literal("")),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ---- Integration System (spec 3.2) ----
export const systemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(slugRegex, "Use lowercase letters, numbers and hyphens"),
  description: z.string().max(500).optional().or(z.literal("")),
  basePath: z
    .string()
    .regex(/^\/[a-zA-Z0-9\-_/]*$/, "Base path must start with / ")
    .optional()
    .or(z.literal("")),
  status: z.enum(SYSTEM_STATUSES),
  defaultHeaders: z.record(z.string()).optional(),
});
export type SystemInput = z.infer<typeof systemSchema>;

// ---- Environment (spec 3.3) ----
export const environmentSchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  slug: z.string().min(2, "Slug is required").regex(slugRegex, "Use lowercase letters, numbers and hyphens"),
  isActive: z.boolean().default(true),
  variables: z.record(z.string()).optional(),
});
export type EnvironmentInput = z.infer<typeof environmentSchema>;

// ---- Request parameter rows (spec 5) ----
export const headerParamSchema = z.object({
  name: z.string().min(1, "Required"),
  required: z.boolean().default(false),
  type: z.string().default("string"),
  example: z.string().optional().or(z.literal("")),
});

export const queryParamSchema = z.object({
  name: z.string().min(1, "Required"),
  required: z.boolean().default(false),
  type: z.string().default("string"),
  allowedValues: z.array(z.string()).optional(),
});

export const pathParamSchema = z.object({
  name: z.string().min(1, "Required"),
  required: z.boolean().default(true),
  type: z.string().default("string"),
});

// ---- Endpoint (spec 3.4 + 10.5) ----
export const endpointSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  method: z.enum(HTTP_METHODS),
  path: z.string().min(1, "Path is required").regex(/^\//, "Path must start with /"),
  description: z.string().max(500).optional().or(z.literal("")),
  authType: z.enum(AUTH_TYPES),
  headers: z.array(headerParamSchema).default([]),
  queryParams: z.array(queryParamSchema).default([]),
  pathParams: z.array(pathParamSchema).default([]),
  requestSchema: z.unknown().optional(),
  responseMode: z.enum(RESPONSE_MODES),
  defaultStatusCode: z.coerce.number().int().min(100).max(599).default(200),
  defaultHeaders: z.record(z.string()).optional(),
  defaultResponseBody: z.unknown().optional(),
  delayMs: z.coerce.number().int().min(0).max(120000).default(0),
  timeoutEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
  webhookId: z.string().optional().nullable(),
});
export type EndpointInput = z.infer<typeof endpointSchema>;

// ---- Response rule condition (spec 6.2) ----
export const ruleConditionSchema = z.object({
  source: z.string().min(1, "Source path is required"),
  operator: z.enum([
    "EQUALS",
    "NOT_EQUALS",
    "CONTAINS",
    "NOT_CONTAINS",
    "STARTS_WITH",
    "ENDS_WITH",
    "GREATER_THAN",
    "GREATER_THAN_OR_EQUAL",
    "LESS_THAN",
    "LESS_THAN_OR_EQUAL",
    "EXISTS",
    "NOT_EXISTS",
    "MATCHES_REGEX",
    "IN",
    "NOT_IN",
  ]),
  value: z.string().optional().or(z.literal("")),
});

export const responseRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  priority: z.coerce.number().int().min(0).default(10),
  conditions: z.array(ruleConditionSchema).default([]),
  statusCode: z.coerce.number().int().min(100).max(599).default(200),
  responseBody: z.unknown().optional(),
  isActive: z.boolean().default(true),
});
export type ResponseRuleInput = z.infer<typeof responseRuleSchema>;

// ---- Webhook (spec 8.1 + 10.6) ----
export const webhookSchema = z.object({
  name: z.string().min(2, "Name is required"),
  triggerEvent: z.string().min(1, "Trigger event is required"),
  endpointId: z.string().optional().nullable(),
  targetUrl: z.string().url("Enter a valid URL"),
  method: z.enum(HTTP_METHODS).default("POST"),
  headers: z.record(z.string()).optional(),
  payloadTemplate: z.unknown().optional(),
  delayMs: z.coerce.number().int().min(0).max(3600000).default(0),
  signatureType: z.enum(SIGNATURE_TYPES).default("NONE"),
  secret: z.string().optional().or(z.literal("")),
  retryEnabled: z.boolean().default(true),
  maxRetries: z.coerce.number().int().min(0).max(10).default(5),
  isActive: z.boolean().default(true),
});
export type WebhookInput = z.infer<typeof webhookSchema>;

// ---- Credential (spec 10.4 / 15) ----
export const credentialSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(AUTH_TYPES).default("API_KEY"),
});
export type CredentialInput = z.infer<typeof credentialSchema>;

// ---- Team invite ----
export const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["OWNER", "ADMINISTRATOR", "DEVELOPER", "QA_TESTER", "VIEWER"]).default("DEVELOPER"),
});
export type InviteInput = z.infer<typeof inviteSchema>;
