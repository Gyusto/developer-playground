import {
  All,
  Controller,
  Param,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RuntimeExecutionService } from './services/runtime-execution.service';

/**
 * Public dynamic runtime endpoint (spec section 4). Handles ALL HTTP methods at
 *   /api/runtime/{workspaceSlug}/{systemSlug}/{environmentSlug}/{endpointPath}
 * Uses @Res() passthrough so responses are returned raw (not portal-enveloped).
 * Rate-limited via the global ThrottlerGuard (limits tightened here).
 */
@ApiExcludeController()
@Throttle({ default: { limit: 300, ttl: 60_000 } })
@Controller({
  path: 'runtime/:workspaceSlug/:systemSlug/:environmentSlug',
  version: VERSION_NEUTRAL,
})
export class RuntimeController {
  constructor(private readonly execution: RuntimeExecutionService) {}

  @All('*')
  async handle(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('systemSlug') systemSlug: string,
    @Param('environmentSlug') environmentSlug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // The wildcard tail is captured by Express as param "0"; fall back to
    // slicing the known prefix off the path for robustness.
    let tail = (req.params as Record<string, string>)['0'];
    if (tail === undefined) {
      const base = `/api/runtime/${workspaceSlug}/${systemSlug}/${environmentSlug}`;
      const idx = req.path.indexOf(base);
      tail = idx >= 0 ? req.path.slice(idx + base.length) : '';
    }
    const path = tail.startsWith('/') ? tail : `/${tail}`;
    const headers = normalizeHeaders(req.headers);
    const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? '';

    try {
      const result = await this.execution.execute({
        workspaceSlug,
        systemSlug,
        environmentSlug,
        method: req.method,
        path,
        headers,
        query: req.query as Record<string, unknown>,
        body: req.body,
        rawBody,
        sourceIp: req.ip,
        correlationId:
          (headers['x-correlation-id'] as string) || undefined,
      });

      for (const [k, v] of Object.entries(result.headers ?? {})) {
        res.setHeader(k, v);
      }
      res.setHeader('X-Request-Id', result.requestLogId);
      if (result.matchedRuleName) {
        res.setHeader('X-Matched-Rule', result.matchedRuleName);
      }
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      const status = (err as { status?: number }).status ?? 404;
      res.status(status).json({
        success: false,
        code: status === 404 ? 'NOT_FOUND' : 'RUNTIME_ERROR',
        message: (err as Error).message,
      });
    }
  }
}

function normalizeHeaders(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}
