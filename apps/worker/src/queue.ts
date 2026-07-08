import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAME } from './config';
import type { WebhookDeliveryJobData } from './processor';

let queue: Queue<WebhookDeliveryJobData> | null = null;

/** Lazily-created singleton BullMQ queue for the webhook-delivery jobs. */
export function getQueue(): Queue<WebhookDeliveryJobData> {
  if (!queue) {
    queue = new Queue<WebhookDeliveryJobData>(QUEUE_NAME, { connection: redisConnection });
  }
  return queue;
}

/** Re-enqueue a delivery as a delayed retry job (worker-managed retries). */
export async function enqueueRetry(data: WebhookDeliveryJobData, delayMs: number): Promise<void> {
  await getQueue().add('deliver', data, {
    delay: delayMs,
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function closeQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
