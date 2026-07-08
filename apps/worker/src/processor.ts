import type { Job } from 'bullmq';
import { renderTemplate } from '@developer-playground/template-engine';
import type { RenderContext } from '@developer-playground/template-engine';
import { prisma, Prisma } from '@developer-playground/database';
import type { Webhook } from '@developer-playground/database';
import { decryptSecret } from './crypto';
import { assertSafeWebhookUrl } from './ssrf-guard';
import { signPayload } from './signature';
import { backoffDelay } from './retry';
import { enqueueRetry } from './queue';

/** Job payload enqueued by the API for each webhook delivery attempt. */
export interface WebhookDeliveryJobData {
  deliveryId: string; // WebhookDelivery.id (row already created PENDING)
  webhookId: string; // Webhook.id
  idempotencyKey: string; // WebhookDelivery.idempotencyKey
  attempt: number; // 1-based; 1 for the first delivery attempt
  context: RenderContext; // used to render payloadTemplate
}

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BODY_CHARS = 2000;

/**
 * Deliver a single webhook. Idempotent (a SUCCESS row short-circuits), does not
 * throw on delivery failure — retries are managed manually by re-enqueuing a
 * delayed job, so BullMQ's own retry machinery is left untouched.
 */
export async function processDelivery(job: Job<WebhookDeliveryJobData>): Promise<void> {
  const { deliveryId, attempt, context } = job.data;

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });
  if (!delivery) return; // nothing to do

  // Idempotency: already delivered.
  if (delivery.status === 'SUCCESS') return;

  const webhook = delivery.webhook as Webhook | null;
  if (!webhook || !webhook.isActive) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: 'FAILED', attempt, errorMessage: 'webhook inactive or missing' },
    });
    return;
  }

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: { status: 'DELIVERING', attempt },
  });

  // Render payload (fall back to the simulated response body when no template).
  const rendered: unknown =
    webhook.payloadTemplate != null
      ? renderTemplate(webhook.payloadTemplate as string | object, context)
      : context.response?.body ?? {};
  const bodyString = JSON.stringify(rendered);

  // Assemble outbound headers.
  const baseHeaders = (webhook.headers as Record<string, string> | null) ?? {};
  const headers: Record<string, string> = { ...baseHeaders, 'Content-Type': 'application/json' };

  const startedAt = Date.now();
  let responseStatus: number | undefined;
  let responseBodyText: string | undefined;
  let errorMessage: string | undefined;

  try {
    // SSRF protection — blocked targets are treated as delivery failures.
    await assertSafeWebhookUrl(delivery.targetUrl);

    // Signature.
    if (webhook.signatureType !== 'NONE' && webhook.encryptedSecret) {
      const secret = decryptSecret(webhook.encryptedSecret);
      const sig = signPayload(webhook.signatureType, secret, bodyString);
      if (sig) headers[sig.header] = sig.value;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(delivery.targetUrl, {
        method: webhook.method || 'POST',
        headers,
        body: bodyString,
        signal: controller.signal,
      });
      responseStatus = res.status;
      responseBodyText = (await res.text()).slice(0, MAX_RESPONSE_BODY_CHARS);
      if (!res.ok) errorMessage = `webhook target responded with HTTP ${res.status}`;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const responseTimeMs = Date.now() - startedAt;
  const success = responseStatus !== undefined && responseStatus >= 200 && responseStatus < 300;

  const requestPayload = rendered as Prisma.InputJsonValue;
  const requestHeaders = headers as Prisma.InputJsonValue;

  if (success) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'SUCCESS',
        attempt,
        responseStatus,
        responseBody: responseBodyText,
        responseTimeMs,
        deliveredAt: new Date(),
        requestPayload,
        requestHeaders,
        errorMessage: null,
      },
    });
    return;
  }

  // Failure path — retry or give up.
  const willRetry = webhook.retryEnabled && attempt < webhook.maxRetries;
  if (willRetry) {
    const delayMs = backoffDelay(attempt);
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'RETRYING',
        attempt,
        responseStatus: responseStatus ?? null,
        responseBody: responseBodyText ?? null,
        responseTimeMs,
        errorMessage: errorMessage ?? 'delivery failed',
        nextRetryAt: new Date(Date.now() + delayMs),
        requestPayload,
        requestHeaders,
      },
    });
    await enqueueRetry({ ...job.data, attempt: attempt + 1 }, delayMs);
  } else {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        attempt,
        responseStatus: responseStatus ?? null,
        responseBody: responseBodyText ?? null,
        responseTimeMs,
        errorMessage: errorMessage ?? 'delivery failed',
        requestPayload,
        requestHeaders,
      },
    });
  }
}
