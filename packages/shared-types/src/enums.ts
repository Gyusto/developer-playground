// Enums mirroring the Prisma schema (packages/database/prisma/schema.prisma).
// Declared as const objects + derived union types so they can be used as both
// runtime values and TS types without importing @prisma/client everywhere.

export const WorkspaceRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEVELOPER',
  QA: 'QA',
  VIEWER: 'VIEWER',
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const SystemStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type SystemStatus = (typeof SystemStatus)[keyof typeof SystemStatus];

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const AuthType = {
  NONE: 'NONE',
  API_KEY: 'API_KEY',
  BASIC: 'BASIC',
  BEARER: 'BEARER',
  HMAC: 'HMAC',
} as const;
export type AuthType = (typeof AuthType)[keyof typeof AuthType];

export const ResponseMode = {
  STATIC: 'STATIC',
  RULE_BASED: 'RULE_BASED',
  RANDOM: 'RANDOM',
  SEQUENCE: 'SEQUENCE',
  SCRIPTED: 'SCRIPTED',
} as const;
export type ResponseMode = (typeof ResponseMode)[keyof typeof ResponseMode];

export const SignatureType = {
  NONE: 'NONE',
  HMAC_SHA256: 'HMAC_SHA256',
  CUSTOM_HEADER: 'CUSTOM_HEADER',
} as const;
export type SignatureType = (typeof SignatureType)[keyof typeof SignatureType];

export const CredentialStatus = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;
export type CredentialStatus =
  (typeof CredentialStatus)[keyof typeof CredentialStatus];

export const DeliveryStatus = {
  PENDING: 'PENDING',
  DELIVERING: 'DELIVERING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const;
export type DeliveryStatus =
  (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

// All 15 rule operators from spec section 6.2.
export const RuleOperator = {
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  CONTAINS: 'CONTAINS',
  NOT_CONTAINS: 'NOT_CONTAINS',
  STARTS_WITH: 'STARTS_WITH',
  ENDS_WITH: 'ENDS_WITH',
  GREATER_THAN: 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',
  LESS_THAN: 'LESS_THAN',
  LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
  EXISTS: 'EXISTS',
  NOT_EXISTS: 'NOT_EXISTS',
  MATCHES_REGEX: 'MATCHES_REGEX',
  IN: 'IN',
  NOT_IN: 'NOT_IN',
} as const;
export type RuleOperator = (typeof RuleOperator)[keyof typeof RuleOperator];
