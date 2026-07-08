import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@developer-playground/database';
import type {
  CreateInboundWebhookDto,
  InboundLogFilterDto,
} from '@developer-playground/validation';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { AccessControlService } from '../common/access/access-control.service';
import { AuditService } from '../audit-logs/audit.service';
import { buildPage, toSkipTake } from '../common/utils/pagination';

export interface InboundCapture {
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  rawBody: string;
  contentType?: string;
  sourceIp?: string;
}

@Injectable()
export class InboundWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly acl: AccessControlService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  // -------- management --------

  async create(
    userId: string,
    environmentId: string,
    workspaceId: string,
    dto: CreateInboundWebhookDto,
  ) {
    const clash = await this.db.inboundWebhookEndpoint.findUnique({
      where: { environmentId_slug: { environmentId, slug: dto.slug } },
    });
    if (clash) throw new ConflictException('Inbound webhook slug already exists');

    const inbound = await this.db.inboundWebhookEndpoint.create({
      data: {
        environmentId,
        name: dto.name,
        slug: dto.slug,
        expectedSignatureType: dto.expectedSignatureType ?? 'NONE',
        encryptedSecret: dto.secret ? this.crypto.encrypt(dto.secret) : undefined,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'InboundWebhookEndpoint',
      entityId: inbound.id,
    });
    const { encryptedSecret, ...rest } = inbound;
    return { ...rest, hasSecret: Boolean(encryptedSecret) };
  }

  listForEnvironment(environmentId: string) {
    return this.db.inboundWebhookEndpoint.findMany({
      where: { environmentId },
      select: {
        id: true,
        name: true,
        slug: true,
        expectedSignatureType: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // -------- receiver (public) --------

  async receive(
    workspaceSlug: string,
    systemSlug: string,
    environmentSlug: string,
    webhookSlug: string,
    capture: InboundCapture,
  ) {
    const inbound = await this.db.inboundWebhookEndpoint.findFirst({
      where: {
        slug: webhookSlug,
        environment: {
          slug: environmentSlug,
          integrationSystem: {
            slug: systemSlug,
            workspace: { slug: workspaceSlug },
          },
        },
      },
    });
    if (!inbound || !inbound.isActive) {
      throw new NotFoundException('Inbound webhook receiver not found');
    }

    let signatureValid: boolean | null = null;
    if (
      inbound.expectedSignatureType === 'HMAC_SHA256' &&
      inbound.encryptedSecret
    ) {
      const provided =
        capture.headers['x-signature'] ?? capture.headers['X-Signature'];
      if (provided) {
        try {
          const secret = this.crypto.decrypt(inbound.encryptedSecret);
          const expected = this.crypto.hmacSha256Hex(secret, capture.rawBody);
          signatureValid = expected === provided;
        } catch {
          signatureValid = false;
        }
      } else {
        signatureValid = false;
      }
    }

    const log = await this.db.inboundWebhookLog.create({
      data: {
        inboundEndpointId: inbound.id,
        method: capture.method,
        url: capture.url,
        headers: this.redact(capture.headers) as Prisma.InputJsonValue,
        query: (capture.query as Prisma.InputJsonValue) ?? undefined,
        body: (capture.body as Prisma.InputJsonValue) ?? undefined,
        contentType: capture.contentType,
        sourceIp: capture.sourceIp,
        signatureValid,
        processingStatus: 'RECEIVED',
      },
    });

    return { received: true, logId: log.id, signatureValid };
  }

  private redact(headers: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      out[k] = ['authorization', 'x-signature'].includes(k.toLowerCase())
        ? '***REDACTED***'
        : v;
    }
    return out;
  }

  // -------- logs --------

  async listLogs(userId: string, filter: InboundLogFilterDto) {
    const where: Prisma.InboundWebhookLogWhereInput = {
      inboundEndpoint: {
        environment: {
          integrationSystem: { workspace: { members: { some: { userId } } } },
        },
      },
      inboundEndpointId: filter.inboundEndpointId,
      processingStatus: filter.processingStatus,
    };
    const { skip, take } = toSkipTake(filter);
    const [items, total] = await Promise.all([
      this.db.inboundWebhookLog.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take,
      }),
      this.db.inboundWebhookLog.count({ where }),
    ]);
    return buildPage(items, total, filter);
  }

  async getLog(userId: string, id: string) {
    const log = await this.assertLogAccess(userId, id);
    return log;
  }

  /** Replay: re-capture the stored payload as a new inbound log entry. */
  async replay(userId: string, id: string) {
    const source = await this.assertLogAccess(userId, id);
    const replayed = await this.db.inboundWebhookLog.create({
      data: {
        inboundEndpointId: source.inboundEndpointId,
        method: source.method,
        url: source.url,
        headers: (source.headers as Prisma.InputJsonValue) ?? undefined,
        query: (source.query as Prisma.InputJsonValue) ?? undefined,
        body: (source.body as Prisma.InputJsonValue) ?? undefined,
        contentType: source.contentType,
        sourceIp: source.sourceIp,
        signatureValid: source.signatureValid,
        processingStatus: 'REPLAYED',
      },
    });
    return { replayed: true, logId: replayed.id };
  }

  private async assertLogAccess(userId: string, id: string) {
    const log = await this.db.inboundWebhookLog.findUnique({
      where: { id },
      include: {
        inboundEndpoint: {
          select: {
            environment: {
              select: { integrationSystem: { select: { workspaceId: true } } },
            },
          },
        },
      },
    });
    if (!log) throw new NotFoundException('Inbound webhook log not found');
    await this.acl.assertMember(
      userId,
      log.inboundEndpoint.environment.integrationSystem.workspaceId,
    );
    return log;
  }
}
