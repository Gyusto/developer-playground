import { z } from 'zod';
import {
  slugSchema,
  zAuthType,
  zHttpMethod,
  zResponseMode,
  zRuleOperator,
  zSignatureType,
  zSystemStatus,
} from './enums';

const jsonValue: z.ZodType<unknown> = z.any();
const jsonObject = z.record(z.any());

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  workspaceName: z.string().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

// ---------------------------------------------------------------------------
// Integration System
// ---------------------------------------------------------------------------

export const createIntegrationSystemSchema = z.object({
  /** Optional — defaults to the user's workspace when omitted. */
  workspaceId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(2000).optional(),
  basePath: z.string().max(200).optional(),
  status: zSystemStatus.optional(),
  defaultHeaders: jsonObject.optional(),
});

export const updateIntegrationSystemSchema =
  createIntegrationSystemSchema.partial();

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export const createEnvironmentSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  isActive: z.boolean().optional(),
  variables: jsonObject.optional(),
});

export const updateEnvironmentSchema = createEnvironmentSchema.partial();

// ---------------------------------------------------------------------------
// Endpoint parameter configs
// ---------------------------------------------------------------------------

const paramType = z.enum(['string', 'number', 'boolean']).optional();

export const headerParamSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().optional(),
  type: paramType,
  example: z.string().optional(),
  allowedValues: z.array(z.string()).optional(),
});

export const queryParamSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().optional(),
  type: paramType,
  allowedValues: z.array(z.string()).optional(),
  example: z.string().optional(),
});

export const pathParamSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().optional(),
  type: paramType,
});

// ---------------------------------------------------------------------------
// API Endpoint
// ---------------------------------------------------------------------------

export const createEndpointSchema = z.object({
  name: z.string().min(1).max(160),
  method: zHttpMethod,
  path: z.string().min(1).max(300).startsWith('/', 'path must start with /'),
  description: z.string().max(2000).optional(),
  authType: zAuthType.optional(),
  headersConfig: z.array(headerParamSchema).optional(),
  queryConfig: z.array(queryParamSchema).optional(),
  pathParamsConfig: z.array(pathParamSchema).optional(),
  requestSchema: jsonObject.optional(),
  responseMode: zResponseMode.optional(),
  defaultStatusCode: z.number().int().min(100).max(599).optional(),
  defaultHeaders: jsonObject.optional(),
  defaultResponseBody: jsonValue.optional(),
  delayMs: z.number().int().min(0).max(120000).optional(),
  timeoutEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateEndpointSchema = createEndpointSchema.partial();

// ---------------------------------------------------------------------------
// Response Rule
// ---------------------------------------------------------------------------

export const ruleConditionSchema = z.object({
  source: z.string().min(1),
  operator: zRuleOperator,
  value: jsonValue.optional(),
});

export const responseDefinitionSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  headers: z.record(z.string()).optional(),
  body: jsonValue.optional(),
  timeout: z.boolean().optional(),
});

export const createResponseRuleSchema = z.object({
  name: z.string().min(1).max(160),
  priority: z.number().int(),
  conditions: z.array(ruleConditionSchema),
  response: responseDefinitionSchema,
  isActive: z.boolean().optional(),
});

export const updateResponseRuleSchema = createResponseRuleSchema.partial();

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(160),
  endpointId: z.string().uuid().optional(),
  targetUrl: z.string().url(),
  method: zHttpMethod.optional(),
  headers: z.record(z.string()).optional(),
  payloadTemplate: jsonValue.optional(),
  triggerEvent: z.string().max(120).optional(),
  delayMs: z.number().int().min(0).max(6 * 60 * 60 * 1000).optional(),
  retryEnabled: z.boolean().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  signatureType: zSignatureType.optional(),
  secret: z.string().min(1).max(400).optional(),
  isActive: z.boolean().optional(),
});

export const updateWebhookSchema = createWebhookSchema.partial();

// ---------------------------------------------------------------------------
// Inbound webhook endpoint
// ---------------------------------------------------------------------------

export const createInboundWebhookSchema = z.object({
  name: z.string().min(1).max(160),
  slug: slugSchema,
  expectedSignatureType: zSignatureType.optional(),
  secret: z.string().min(1).max(400).optional(),
  isActive: z.boolean().optional(),
});

export const updateInboundWebhookSchema = createInboundWebhookSchema.partial();

// ---------------------------------------------------------------------------
// Credential
// ---------------------------------------------------------------------------

export const createCredentialSchema = z.object({
  name: z.string().min(1).max(160),
  type: zAuthType.optional(),
  // For BASIC credentials the caller may supply a username.
  username: z.string().min(1).max(160).optional(),
});

// ---------------------------------------------------------------------------
// Endpoint test
// ---------------------------------------------------------------------------

export const testEndpointSchema = z.object({
  headers: z.record(z.string()).optional(),
  query: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
  body: jsonValue.optional(),
});

// ---------------------------------------------------------------------------
// Pagination / list query
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export const requestLogFilterSchema = paginationSchema.extend({
  environmentId: z.string().uuid().optional(),
  endpointId: z.string().uuid().optional(),
  statusCode: z.coerce.number().int().optional(),
  method: zHttpMethod.optional(),
  correlationId: z.string().optional(),
});

export const webhookDeliveryFilterSchema = paginationSchema.extend({
  webhookId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'DELIVERING', 'SUCCESS', 'FAILED', 'RETRYING']).optional(),
});

export const inboundLogFilterSchema = paginationSchema.extend({
  inboundEndpointId: z.string().uuid().optional(),
  processingStatus: z.string().optional(),
});
