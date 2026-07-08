import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import type { CreateWebhookDto, UpdateWebhookDto } from '@developer-playground/validation';
import type { Prisma } from '@developer-playground/database';
import type { RenderContext } from '@developer-playground/template-engine';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { AuditService } from '../audit-logs/audit.service';
import {
  WEBHOOK_QUEUE_TOKEN,
  type WebhookDeliveryJobData,
} from '../queue/queue.constants';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    @Inject(WEBHOOK_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Strip the encrypted secret before returning a webhook to clients. */
  private sanitize<T extends { encryptedSecret?: string | null }>(webhook: T) {
    const { encryptedSecret, ...rest } = webhook;
    return { ...rest, hasSecret: Boolean(encryptedSecret) };
  }

  async create(
    userId: string,
    environmentId: string,
    workspaceId: string,
    dto: CreateWebhookDto,
  ) {
    const webhook = await this.db.webhook.create({
      data: {
        environmentId,
        endpointId: dto.endpointId,
        name: dto.name,
        targetUrl: dto.targetUrl,
        method: dto.method ?? 'POST',
        headers: (dto.headers as Prisma.InputJsonValue) ?? undefined,
        payloadTemplate:
          (dto.payloadTemplate as Prisma.InputJsonValue) ?? undefined,
        triggerEvent: dto.triggerEvent,
        delayMs: dto.delayMs ?? 0,
        retryEnabled: dto.retryEnabled ?? true,
        maxRetries: dto.maxRetries ?? 5,
        signatureType: dto.signatureType ?? 'NONE',
        encryptedSecret: dto.secret ? this.crypto.encrypt(dto.secret) : undefined,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'Webhook',
      entityId: webhook.id,
      metadata: { name: webhook.name, targetUrl: webhook.targetUrl },
    });
    return this.sanitize(webhook);
  }

  async listForEnvironment(environmentId: string) {
    const webhooks = await this.db.webhook.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
    });
    return webhooks.map((w) => this.sanitize(w));
  }

  async getOne(id: string) {
    const webhook = await this.db.webhook.findUnique({ where: { id } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    return this.sanitize(webhook);
  }

  async update(
    userId: string,
    id: string,
    workspaceId: string,
    dto: UpdateWebhookDto,
  ) {
    const webhook = await this.db.webhook.update({
      where: { id },
      data: {
        endpointId: dto.endpointId,
        name: dto.name,
        targetUrl: dto.targetUrl,
        method: dto.method,
        headers:
          dto.headers !== undefined
            ? (dto.headers as Prisma.InputJsonValue)
            : undefined,
        payloadTemplate:
          dto.payloadTemplate !== undefined
            ? (dto.payloadTemplate as Prisma.InputJsonValue)
            : undefined,
        triggerEvent: dto.triggerEvent,
        delayMs: dto.delayMs,
        retryEnabled: dto.retryEnabled,
        maxRetries: dto.maxRetries,
        signatureType: dto.signatureType,
        encryptedSecret: dto.secret ? this.crypto.encrypt(dto.secret) : undefined,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'UPDATE',
      entityType: 'Webhook',
      entityId: id,
      metadata: { ...dto, secret: dto.secret ? '***' : undefined },
    });
    return this.sanitize(webhook);
  }

  async remove(userId: string, id: string, workspaceId: string) {
    await this.db.webhook.delete({ where: { id } });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'DELETE',
      entityType: 'Webhook',
      entityId: id,
    });
    return { deleted: true };
  }

  /** Fire a one-off test delivery with sample request/response context. */
  async test(id: string) {
    const webhook = await this.db.webhook.findUnique({
      where: { id },
      include: {
        environment: { include: { integrationSystem: true } },
      },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const context: RenderContext = {
      request: {
        id: uuidv4(),
        body: { externalId: 'TEST-0001', amount: 15000, currency: 'TZS' },
        query: {},
        params: {},
        headers: {},
      },
      response: { statusCode: 200, body: { transactionId: uuidv4() } },
      environment:
        (webhook.environment.variables as Record<string, unknown>) ?? {},
      system: { name: webhook.environment.integrationSystem.name },
    };

    const idempotencyKey = `test:${webhook.id}:${uuidv4()}`;
    const delivery = await this.db.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
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
    await this.queue.add('deliver', jobData, { jobId: delivery.id });

    return { enqueued: true, deliveryId: delivery.id };
  }

  /** Manually re-enqueue a delivery (spec section 11 retry). */
  async retryDelivery(deliveryId: string) {
    const delivery = await this.db.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true, requestLog: true },
    });
    if (!delivery) throw new NotFoundException('Webhook delivery not found');
    if (delivery.status === 'SUCCESS') {
      throw new BadRequestException('Delivery already succeeded');
    }

    // Rebuild a minimal context from the original request log if available.
    const log = delivery.requestLog;
    const context: RenderContext = log
      ? {
          request: {
            id: log.id,
            body: log.requestBody as unknown,
            query: (log.requestQuery as Record<string, unknown>) ?? {},
            params: (log.requestParams as Record<string, unknown>) ?? {},
            headers: (log.requestHeaders as Record<string, unknown>) ?? {},
          },
          response: { body: log.responseBody as unknown },
        }
      : { request: { id: delivery.id } };

    await this.db.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', nextRetryAt: null, errorMessage: null },
    });

    const jobData: WebhookDeliveryJobData = {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      idempotencyKey: delivery.idempotencyKey,
      attempt: delivery.attempt + 1,
      context,
    };
    await this.queue.add('deliver', jobData, {
      jobId: `${delivery.id}-manual-${Date.now()}`,
    });

    return { requeued: true, deliveryId };
  }
}
