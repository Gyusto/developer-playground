import { Injectable } from '@nestjs/common';
import type { ApiEndpoint } from '@developer-playground/database';
import type {
  ResponseDefinition,
  SequenceItem,
  WeightedResponse,
} from '@developer-playground/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_DELAY_MS = 120_000;

/**
 * Selects and shapes the final response for an endpoint (spec 6.3/6.4) and
 * applies delay / timeout simulation (spec section 4 step 8).
 *
 * Convention: for RANDOM mode `defaultResponseBody` holds a WeightedResponse[],
 * for SEQUENCE mode it holds a SequenceItem[]. RULE_BASED matches are resolved
 * upstream and passed in via `ruleResponse`.
 */
@Injectable()
export class ResponseSimulationService {
  constructor(private readonly prisma: PrismaService) {}

  async select(
    endpoint: ApiEndpoint,
    ruleResponse: ResponseDefinition | null,
  ): Promise<ResponseDefinition> {
    const fallback: ResponseDefinition = {
      statusCode: endpoint.defaultStatusCode,
      headers: (endpoint.defaultHeaders as Record<string, string>) ?? undefined,
      body: endpoint.defaultResponseBody ?? null,
      timeout: endpoint.timeoutEnabled,
    };

    switch (endpoint.responseMode) {
      case 'RULE_BASED':
        return this.withTimeout(ruleResponse ?? fallback, endpoint);
      case 'RANDOM':
        return this.withTimeout(this.pickRandom(endpoint) ?? fallback, endpoint);
      case 'SEQUENCE':
        return this.withTimeout(await this.pickSequence(endpoint), endpoint);
      case 'STATIC':
      case 'SCRIPTED': // scripted not supported in MVP -> behaves as static
      default:
        return this.withTimeout(fallback, endpoint);
    }
  }

  private withTimeout(
    def: ResponseDefinition,
    endpoint: ApiEndpoint,
  ): ResponseDefinition {
    if (endpoint.timeoutEnabled || def.timeout) {
      return {
        statusCode: 504,
        headers: def.headers,
        body: { success: false, message: 'Simulated gateway timeout' },
        timeout: true,
      };
    }
    return def;
  }

  private pickRandom(endpoint: ApiEndpoint): ResponseDefinition | null {
    const variants = endpoint.defaultResponseBody as unknown;
    if (!Array.isArray(variants) || variants.length === 0) return null;
    const list = variants as WeightedResponse[];
    const total = list.reduce((sum, v) => sum + (v.weight ?? 0), 0);
    if (total <= 0) return null;
    let roll = Math.random() * total;
    for (const v of list) {
      roll -= v.weight ?? 0;
      if (roll <= 0) {
        return {
          statusCode: v.statusCode ?? endpoint.defaultStatusCode,
          headers: v.headers,
          body: v.body ?? null,
          timeout: v.timeout,
        };
      }
    }
    return null;
  }

  private async pickSequence(
    endpoint: ApiEndpoint,
  ): Promise<ResponseDefinition> {
    const items = endpoint.defaultResponseBody as unknown;
    const list = Array.isArray(items) ? (items as SequenceItem[]) : [];
    if (list.length === 0) {
      return {
        statusCode: endpoint.defaultStatusCode,
        body: null,
      };
    }

    // Atomically read+advance the persistent sequence cursor.
    const state = await this.prisma.client.endpointSequenceState.upsert({
      where: { endpointId: endpoint.id },
      create: { endpointId: endpoint.id, cursor: 0 },
      update: {},
    });
    const index = Math.min(state.cursor, list.length - 1);
    const nextCursor = state.cursor + 1 < list.length ? state.cursor + 1 : list.length - 1;
    await this.prisma.client.endpointSequenceState.update({
      where: { endpointId: endpoint.id },
      data: { cursor: nextCursor },
    });

    const item = list[index];
    return {
      statusCode: item.statusCode ?? endpoint.defaultStatusCode,
      headers: item.headers,
      body: item.body ?? null,
      timeout: item.timeout,
    };
  }

  async applyDelay(delayMs: number): Promise<void> {
    const ms = Math.max(0, Math.min(delayMs || 0, MAX_DELAY_MS));
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }
}
