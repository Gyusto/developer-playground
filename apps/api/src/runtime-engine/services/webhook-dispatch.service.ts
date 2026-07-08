import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Webhook } from '@developer-playground/database';
import type { RenderContext } from '@developer-playground/template-engine';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WEBHOOK_QUEUE_TOKEN,
  type WebhookDeliveryJobData,
} from '../../queue/queue.constants';

/**
 * Creates PENDING WebhookDelivery rows and enqueues delivery jobs on the
 * shared BullMQ queue for the worker (spec section 4 step 11, section 8.1).
 */
@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger('WebhookDispatch');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WEBHOOK_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  async dispatch(
    webhooks: Webhook[],
    requestLogId: string,
    correlationId: string,
    context: RenderContext,
  ): Promise<void> {
    for (const webhook of webhooks) {
      const idempotencyKey = `${requestLogId}:${webhook.id}`;
      try {
        const delivery = await this.prisma.client.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            requestLogId,
            idempotencyKey,
            event: webhook.triggerEvent,
            targetUrl: webhook.targetUrl,
            attempt: 0,
            maxRetries: webhook.maxRetries,
            status: 'PENDING',
          },
        });

        const jobData: WebhookDeliveryJobData = {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          idempotencyKey,
          attempt: 1,
          context,
        };

        await this.queue.add('deliver', jobData, {
          jobId: delivery.id,
          delay: Math.max(0, webhook.delayMs || 0),
          removeOnComplete: 1000,
          removeOnFail: 5000,
        });
      } catch (err) {
        // A duplicate idempotencyKey means this webhook was already enqueued.
        this.logger.warn(
          `Skipping webhook ${webhook.id} dispatch: ${(err as Error).message}`,
        );
      }
    }
  }
}
