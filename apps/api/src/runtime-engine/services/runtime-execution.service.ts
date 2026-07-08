import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { RenderContext } from '@developer-playground/template-engine';
import type {
  ResponseDefinition,
  ResponseRuleCondition,
} from '@developer-playground/shared-types';
import { RuntimeResolverService } from './runtime-resolver.service';
import { AuthenticationValidatorService } from './authentication-validator.service';
import { RequestValidatorService } from './request-validator.service';
import { RuleEvaluationService } from './rule-evaluation.service';
import { TemplateRendererService } from './template-renderer.service';
import { ResponseSimulationService } from './response-simulation.service';
import { RequestLoggingService } from './request-logging.service';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface RuntimeRequest {
  workspaceSlug: string;
  systemSlug: string;
  environmentSlug: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  rawBody: string;
  sourceIp?: string;
  correlationId?: string;
  /** Portal "test" mode: skip auth enforcement and do not fire webhooks. */
  skipAuth?: boolean;
  fireWebhooks?: boolean;
}

export interface RuntimeResult {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  requestLogId: string;
  matchedRuleName?: string | null;
}

@Injectable()
export class RuntimeExecutionService {
  private readonly logger = new Logger('RuntimeExecution');

  constructor(
    private readonly resolver: RuntimeResolverService,
    private readonly authValidator: AuthenticationValidatorService,
    private readonly requestValidator: RequestValidatorService,
    private readonly ruleEvaluator: RuleEvaluationService,
    private readonly renderer: TemplateRendererService,
    private readonly simulation: ResponseSimulationService,
    private readonly logging: RequestLoggingService,
    private readonly dispatcher: WebhookDispatchService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(req: RuntimeRequest): Promise<RuntimeResult> {
    const start = Date.now();
    const correlationId = req.correlationId ?? uuidv4();
    const requestLogId = uuidv4();

    // Steps 1-4: resolve workspace -> system -> environment -> endpoint.
    const resolved = await this.resolver.resolve(
      req.workspaceSlug,
      req.systemSlug,
      req.environmentSlug,
      req.method,
      req.path,
    );
    const { endpoint, environment, system } = resolved;

    // Base render context (spec section 7).
    const context: RenderContext = {
      request: {
        id: requestLogId,
        body: req.body,
        query: req.query,
        params: resolved.pathParams,
        headers: req.headers,
      },
      environment: (environment.variables as Record<string, unknown>) ?? {},
      system: { name: system.name },
    };

    // Step 5: authentication.
    let authOk = true;
    if (!req.skipAuth && endpoint.authType !== 'NONE') {
      const credentials = await this.resolver.loadActiveCredentials(
        environment.id,
      );
      const authResult = await this.authValidator.validate({
        authType: endpoint.authType,
        headers: req.headers,
        rawBody: req.rawBody,
        credentials,
      });
      authOk = authResult.ok;
      if (!authOk) {
        return this.finish(req, resolved, context, {
          statusCode: 401,
          headers: {},
          body: {
            success: false,
            code: 'UNAUTHORIZED',
            message: authResult.message ?? 'Unauthorized',
          },
          authOk: false,
          validationOk: true,
          matchedRuleId: null,
          matchedRuleName: null,
          requestLogId,
          correlationId,
          start,
          fireWebhooks: false,
        });
      }
      if (authResult.credentialId) {
        await this.prisma.client.apiCredential
          .update({
            where: { id: authResult.credentialId },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => undefined);
      }
    }

    // Step 6: validate headers, query, path params, body.
    const validation = this.requestValidator.validate({
      headersConfig: endpoint.headersConfig as never,
      queryConfig: endpoint.queryConfig as never,
      pathParamsConfig: endpoint.pathParamsConfig as never,
      requestSchema: endpoint.requestSchema as object | null,
      headers: req.headers,
      query: req.query,
      params: resolved.pathParams,
      body: req.body,
    });
    if (!validation.ok) {
      return this.finish(req, resolved, context, {
        statusCode: 422,
        headers: {},
        body: {
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          errors: validation.errors,
        },
        authOk,
        validationOk: false,
        matchedRuleId: null,
        matchedRuleName: null,
        requestLogId,
        correlationId,
        start,
        fireWebhooks: false,
      });
    }

    // Step 7: evaluate response rules (RULE_BASED).
    let ruleResponse: ResponseDefinition | null = null;
    let matchedRuleId: string | null = null;
    let matchedRuleName: string | null = null;
    if (endpoint.responseMode === 'RULE_BASED') {
      const match = this.ruleEvaluator.evaluate(
        endpoint.rules.map((r) => ({
          id: r.id,
          name: r.name,
          priority: r.priority,
          conditions: (r.conditions as unknown as ResponseRuleCondition[]) ?? [],
          response: r.response,
          isActive: r.isActive,
        })),
        context,
      );
      if (match) {
        matchedRuleId = match.id;
        matchedRuleName = match.name;
        ruleResponse = match.response as ResponseDefinition;
      }
    }

    // Step 8/9: select final response (STATIC/RANDOM/SEQUENCE/timeout).
    const selected = await this.simulation.select(endpoint, ruleResponse);

    // Render templated body + headers.
    const renderedBody = this.renderer.render(
      selected.body as never,
      context,
    );
    const renderedHeaders = this.renderer.render<Record<string, string>>(
      (selected.headers as never) ?? {},
      context,
    );

    // Step 8: apply configured delay.
    await this.simulation.applyDelay(endpoint.delayMs);

    return this.finish(req, resolved, context, {
      statusCode: selected.statusCode,
      headers: renderedHeaders,
      body: renderedBody,
      authOk,
      validationOk: true,
      matchedRuleId,
      matchedRuleName,
      requestLogId,
      correlationId,
      start,
      fireWebhooks: req.fireWebhooks !== false && !req.skipAuth,
    });
  }

  /** Steps 10-11: persist the log and dispatch webhooks. */
  private async finish(
    req: RuntimeRequest,
    resolved: Awaited<ReturnType<RuntimeResolverService['resolve']>>,
    context: RenderContext,
    outcome: {
      statusCode: number;
      headers: Record<string, string>;
      body: unknown;
      authOk: boolean;
      validationOk: boolean;
      matchedRuleId: string | null;
      matchedRuleName: string | null;
      requestLogId: string;
      correlationId: string;
      start: number;
      fireWebhooks: boolean;
    },
  ): Promise<RuntimeResult> {
    const responseTimeMs = Date.now() - outcome.start;

    // Step 10: save the request log (best-effort; must not break the response).
    await this.logging
      .save({
        id: outcome.requestLogId,
        environmentId: resolved.environment.id,
        endpointId: resolved.endpoint.id,
        correlationId: outcome.correlationId,
        method: req.method,
        path: req.path,
        statusCode: outcome.statusCode,
        authOk: outcome.authOk,
        validationOk: outcome.validationOk,
        matchedRuleId: outcome.matchedRuleId,
        matchedRuleName: outcome.matchedRuleName,
        requestHeaders: req.headers,
        requestQuery: req.query,
        requestParams: resolved.pathParams,
        requestBody: req.body,
        responseHeaders: outcome.headers,
        responseBody: outcome.body,
        responseTimeMs,
        sourceIp: req.sourceIp,
      })
      .catch((err) => {
        this.logger.warn(`Failed to persist request log: ${err.message}`);
        return { id: outcome.requestLogId };
      });

    // Step 11: dispatch linked webhooks on a successful response.
    if (outcome.fireWebhooks && outcome.statusCode < 400) {
      const webhooks = await this.resolver.loadWebhooks(
        resolved.environment.id,
        resolved.endpoint.id,
      );
      if (webhooks.length > 0) {
        const webhookContext: RenderContext = {
          ...context,
          response: {
            statusCode: outcome.statusCode,
            headers: outcome.headers,
            body: outcome.body,
          },
        };
        await this.dispatcher.dispatch(
          webhooks,
          outcome.requestLogId,
          outcome.correlationId,
          webhookContext,
        );
      }
    }

    return {
      statusCode: outcome.statusCode,
      headers: outcome.headers,
      body: outcome.body,
      requestLogId: outcome.requestLogId,
      matchedRuleName: outcome.matchedRuleName,
    };
  }
}
