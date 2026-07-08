import { z } from 'zod';

// Zod enums mirroring the Prisma / shared-types enums.

export const zHttpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export const zAuthType = z.enum(['NONE', 'API_KEY', 'BASIC', 'BEARER', 'HMAC']);
export const zResponseMode = z.enum([
  'STATIC',
  'RULE_BASED',
  'RANDOM',
  'SEQUENCE',
  'SCRIPTED',
]);
export const zSystemStatus = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const zSignatureType = z.enum(['NONE', 'HMAC_SHA256', 'CUSTOM_HEADER']);
export const zWorkspaceRole = z.enum([
  'OWNER',
  'ADMIN',
  'DEVELOPER',
  'QA',
  'VIEWER',
]);
export const zRuleOperator = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'NOT_CONTAINS',
  'STARTS_WITH',
  'ENDS_WITH',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'EXISTS',
  'NOT_EXISTS',
  'MATCHES_REGEX',
  'IN',
  'NOT_IN',
]);

const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a URL-safe slug (lowercase, hyphens)');

export const slugSchema = slug;
