import { All, Controller, Param, Req, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { InboundWebhooksService } from './inbound-webhooks.service';

/**
 * Public inbound webhook receiver (spec section 8.2):
 *   ALL /api/webhook-receiver/{workspaceSlug}/{systemSlug}/{environmentSlug}/{webhookSlug}
 * Captures the full request and records an InboundWebhookLog.
 */
@ApiExcludeController()
@Throttle({ default: { limit: 300, ttl: 60_000 } })
@Controller({
  path: 'webhook-receiver/:workspaceSlug/:systemSlug/:environmentSlug/:webhookSlug',
  version: VERSION_NEUTRAL,
})
export class InboundWebhookReceiverController {
  constructor(private readonly service: InboundWebhooksService) {}

  @All()
  async receive(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('systemSlug') systemSlug: string,
    @Param('environmentSlug') environmentSlug: string,
    @Param('webhookSlug') webhookSlug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      headers[k] = Array.isArray(v) ? v.join(', ') : v;
    }
    const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? '';

    try {
      const result = await this.service.receive(
        workspaceSlug,
        systemSlug,
        environmentSlug,
        webhookSlug,
        {
          method: req.method,
          url: req.originalUrl,
          headers,
          query: req.query as Record<string, unknown>,
          body: req.body,
          rawBody,
          contentType: headers['content-type'],
          sourceIp: req.ip,
        },
      );
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      const status = (err as { status?: number }).status ?? 404;
      res
        .status(status)
        .json({ success: false, message: (err as Error).message });
    }
  }
}
