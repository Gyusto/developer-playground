export const WEBHOOK_QUEUE = 'webhook-delivery';
export const WEBHOOK_QUEUE_TOKEN = 'WEBHOOK_DELIVERY_QUEUE';

/** Job payload enqueued for the worker. Must stay in sync with apps/worker. */
export interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  idempotencyKey: string;
  attempt: number;
  context: import('@developer-playground/template-engine').RenderContext;
}
