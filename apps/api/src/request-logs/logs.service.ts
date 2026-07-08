import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@developer-playground/database';
import type {
  RequestLogFilterDto,
  WebhookDeliveryFilterDto,
} from '@developer-playground/validation';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../common/access/access-control.service';
import { buildPage, toSkipTake } from '../common/utils/pagination';

@Injectable()
export class LogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acl: AccessControlService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  async listRequestLogs(userId: string, filter: RequestLogFilterDto) {
    const where: Prisma.RequestLogWhereInput = {
      environment: {
        integrationSystem: { workspace: { members: { some: { userId } } } },
      },
      environmentId: filter.environmentId,
      endpointId: filter.endpointId,
      statusCode: filter.statusCode,
      method: filter.method,
      correlationId: filter.correlationId,
    };
    const { skip, take } = toSkipTake(filter);
    const [items, total] = await Promise.all([
      this.db.requestLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.db.requestLog.count({ where }),
    ]);
    return buildPage(items, total, filter);
  }

  async getRequestLog(userId: string, id: string) {
    const workspaceId = await this.acl.resolveWorkspaceId('requestLog', id);
    await this.acl.assertMember(userId, workspaceId);
    const log = await this.db.requestLog.findUnique({
      where: { id },
      include: { deliveries: true, endpoint: true },
    });
    if (!log) throw new NotFoundException('Request log not found');
    return log;
  }

  async listDeliveries(userId: string, filter: WebhookDeliveryFilterDto) {
    const where: Prisma.WebhookDeliveryWhereInput = {
      webhook: {
        environment: {
          integrationSystem: { workspace: { members: { some: { userId } } } },
        },
      },
      webhookId: filter.webhookId,
      status: filter.status,
    };
    const { skip, take } = toSkipTake(filter);
    const [items, total] = await Promise.all([
      this.db.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.db.webhookDelivery.count({ where }),
    ]);
    return buildPage(items, total, filter);
  }

  async getDelivery(userId: string, id: string) {
    const workspaceId = await this.acl.resolveWorkspaceId('delivery', id);
    await this.acl.assertMember(userId, workspaceId);
    const delivery = await this.db.webhookDelivery.findUnique({
      where: { id },
      include: { webhook: true },
    });
    if (!delivery) throw new NotFoundException('Webhook delivery not found');
    return delivery;
  }
}
