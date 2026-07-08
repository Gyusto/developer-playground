import { z } from 'zod';
import * as s from './schemas';

export * from './enums';
export * from './schemas';

// Inferred DTO types.
export type RegisterDto = z.infer<typeof s.registerSchema>;
export type LoginDto = z.infer<typeof s.loginSchema>;
export type ForgotPasswordDto = z.infer<typeof s.forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof s.resetPasswordSchema>;

export type CreateIntegrationSystemDto = z.infer<
  typeof s.createIntegrationSystemSchema
>;
export type UpdateIntegrationSystemDto = z.infer<
  typeof s.updateIntegrationSystemSchema
>;

export type CreateEnvironmentDto = z.infer<typeof s.createEnvironmentSchema>;
export type UpdateEnvironmentDto = z.infer<typeof s.updateEnvironmentSchema>;

export type HeaderParamDto = z.infer<typeof s.headerParamSchema>;
export type QueryParamDto = z.infer<typeof s.queryParamSchema>;
export type PathParamDto = z.infer<typeof s.pathParamSchema>;

export type CreateEndpointDto = z.infer<typeof s.createEndpointSchema>;
export type UpdateEndpointDto = z.infer<typeof s.updateEndpointSchema>;

export type RuleConditionDto = z.infer<typeof s.ruleConditionSchema>;
export type ResponseDefinitionDto = z.infer<typeof s.responseDefinitionSchema>;
export type CreateResponseRuleDto = z.infer<typeof s.createResponseRuleSchema>;
export type UpdateResponseRuleDto = z.infer<typeof s.updateResponseRuleSchema>;

export type CreateWebhookDto = z.infer<typeof s.createWebhookSchema>;
export type UpdateWebhookDto = z.infer<typeof s.updateWebhookSchema>;

export type CreateInboundWebhookDto = z.infer<
  typeof s.createInboundWebhookSchema
>;
export type UpdateInboundWebhookDto = z.infer<
  typeof s.updateInboundWebhookSchema
>;

export type CreateCredentialDto = z.infer<typeof s.createCredentialSchema>;
export type TestEndpointDto = z.infer<typeof s.testEndpointSchema>;

export type PaginationDto = z.infer<typeof s.paginationSchema>;
export type RequestLogFilterDto = z.infer<typeof s.requestLogFilterSchema>;
export type WebhookDeliveryFilterDto = z.infer<
  typeof s.webhookDeliveryFilterSchema
>;
export type InboundLogFilterDto = z.infer<typeof s.inboundLogFilterSchema>;
