import { Injectable } from '@nestjs/common';
import type { Prisma } from '@developer-playground/database';
import { PrismaService } from '../../prisma/prisma.service';

const REDACTED = '***REDACTED***';
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'x-api-key',
  'x-signature',
  'cookie',
]);

export interface RequestLogInput {
  /** Pre-generated id so it matches {{request.id}} and webhook FKs. */
  id?: string;
  environmentId: string;
  endpointId?: string | null;
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  authOk: boolean;
  validationOk: boolean;
  matchedRuleId?: string | null;
  matchedRuleName?: string | null;
  requestHeaders: Record<string, string>;
  requestQuery: Record<string, unknown>;
  requestParams: Record<string, unknown>;
  requestBody: unknown;
  responseHeaders?: Record<string, string> | null;
  responseBody: unknown;
  responseTimeMs: number;
  sourceIp?: string | null;
}

/** Persists a complete request/response log (spec section 4 step 10). */
@Injectable()
export class RequestLoggingService {
  constructor(private readonly prisma: PrismaService) {}

  private redactHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? REDACTED : v;
    }
    return out;
  }

  async save(input: RequestLogInput): Promise<{ id: string }> {
    const log = await this.prisma.client.requestLog.create({
      data: {
        id: input.id,
        environmentId: input.environmentId,
        endpointId: input.endpointId ?? null,
        correlationId: input.correlationId,
        method: input.method,
        path: input.path,
        statusCode: input.statusCode,
        authOk: input.authOk,
        validationOk: input.validationOk,
        matchedRuleId: input.matchedRuleId ?? null,
        matchedRuleName: input.matchedRuleName ?? null,
        requestHeaders: this.redactHeaders(input.requestHeaders) as Prisma.InputJsonValue,
        requestQuery: (input.requestQuery as Prisma.InputJsonValue) ?? undefined,
        requestParams: (input.requestParams as Prisma.InputJsonValue) ?? undefined,
        requestBody: (input.requestBody as Prisma.InputJsonValue) ?? undefined,
        responseHeaders:
          (input.responseHeaders as Prisma.InputJsonValue) ?? undefined,
        responseBody: (input.responseBody as Prisma.InputJsonValue) ?? undefined,
        responseTimeMs: input.responseTimeMs,
        sourceIp: input.sourceIp ?? null,
      },
      select: { id: true },
    });
    return log;
  }
}
