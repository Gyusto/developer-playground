import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from '@developer-playground/validation';
import type { Prisma } from '@developer-playground/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit-logs/audit.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Build the public runtime + inbound-webhook base URLs for an environment. */
  private async decorate(envId: string) {
    const env = await this.db.environment.findUnique({
      where: { id: envId },
      include: { integrationSystem: { include: { workspace: true } } },
    });
    if (!env) throw new NotFoundException('Environment not found');
    const ws = env.integrationSystem.workspace.slug;
    const sys = env.integrationSystem.slug;
    const base = this.config.publicBaseUrl.replace(/\/$/, '');
    return {
      ...env,
      baseUrl: `${base}/api/runtime/${ws}/${sys}/${env.slug}`,
      webhookReceiverBaseUrl: `${base}/api/webhook-receiver/${ws}/${sys}/${env.slug}`,
    };
  }

  async create(
    userId: string,
    systemId: string,
    workspaceId: string,
    dto: CreateEnvironmentDto,
  ) {
    const clash = await this.db.environment.findUnique({
      where: {
        integrationSystemId_slug: {
          integrationSystemId: systemId,
          slug: dto.slug,
        },
      },
    });
    if (clash) throw new ConflictException('Environment slug already exists');

    const env = await this.db.environment.create({
      data: {
        integrationSystemId: systemId,
        name: dto.name,
        slug: dto.slug,
        isActive: dto.isActive ?? true,
        variables: (dto.variables as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'Environment',
      entityId: env.id,
      metadata: { name: env.name, slug: env.slug, systemId },
    });
    return this.decorate(env.id);
  }

  async listForSystem(systemId: string) {
    const envs = await this.db.environment.findMany({
      where: { integrationSystemId: systemId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(envs.map((e) => this.decorate(e.id)));
  }

  async getOne(id: string) {
    return this.decorate(id);
  }

  async update(
    userId: string,
    id: string,
    workspaceId: string,
    dto: UpdateEnvironmentDto,
  ) {
    await this.db.environment.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        isActive: dto.isActive,
        variables:
          dto.variables !== undefined
            ? (dto.variables as Prisma.InputJsonValue)
            : undefined,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'UPDATE',
      entityType: 'Environment',
      entityId: id,
      metadata: dto,
    });
    return this.decorate(id);
  }

  async remove(userId: string, id: string, workspaceId: string) {
    await this.db.environment.delete({ where: { id } });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'DELETE',
      entityType: 'Environment',
      entityId: id,
    });
    return { deleted: true };
  }

  /** Reset request counters and sequence state (spec 10.4). */
  async resetState(userId: string, id: string, workspaceId: string) {
    await this.db.endpointSequenceState.updateMany({
      where: { endpoint: { environmentId: id } },
      data: { cursor: 0 },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'RESET_STATE',
      entityType: 'Environment',
      entityId: id,
    });
    return { reset: true };
  }
}
