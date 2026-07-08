import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateIntegrationSystemDto,
  UpdateIntegrationSystemDto,
} from '@developer-playground/validation';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../common/access/access-control.service';
import { AuditService } from '../audit-logs/audit.service';
import type { Prisma } from '@developer-playground/database';

@Injectable()
export class IntegrationSystemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acl: AccessControlService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  async create(userId: string, dto: CreateIntegrationSystemDto) {
    const workspaceId = await this.acl.resolveUserWorkspace(
      userId,
      dto.workspaceId,
    );

    const existing = await this.db.integrationSystem.findUnique({
      where: { workspaceId_slug: { workspaceId, slug: dto.slug } },
    });
    if (existing) {
      throw new ConflictException('A system with this slug already exists');
    }

    const system = await this.db.integrationSystem.create({
      data: {
        workspaceId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        basePath: dto.basePath,
        status: dto.status ?? 'ACTIVE',
        defaultHeaders: (dto.defaultHeaders as Prisma.InputJsonValue) ?? undefined,
        createdBy: userId,
      },
    });

    await this.audit.record({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'IntegrationSystem',
      entityId: system.id,
      metadata: { name: system.name, slug: system.slug },
    });
    return system;
  }

  async list(userId: string, workspaceId?: string) {
    const wsId = await this.acl.resolveUserWorkspace(userId, workspaceId);
    return this.db.integrationSystem.findMany({
      where: { workspaceId: wsId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { environments: true } } },
    });
  }

  async getOne(id: string) {
    const system = await this.db.integrationSystem.findUnique({
      where: { id },
      include: { environments: true },
    });
    if (!system) throw new NotFoundException('Integration system not found');
    return system;
  }

  async update(
    userId: string,
    id: string,
    workspaceId: string,
    dto: UpdateIntegrationSystemDto,
  ) {
    // Uniqueness guard when slug changes.
    if (dto.slug) {
      const clash = await this.db.integrationSystem.findFirst({
        where: { workspaceId, slug: dto.slug, id: { not: id } },
      });
      if (clash) throw new ConflictException('Slug already in use');
    }

    const system = await this.db.integrationSystem.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        basePath: dto.basePath,
        status: dto.status,
        defaultHeaders:
          dto.defaultHeaders !== undefined
            ? (dto.defaultHeaders as Prisma.InputJsonValue)
            : undefined,
      },
    });

    await this.audit.record({
      workspaceId,
      userId,
      action: 'UPDATE',
      entityType: 'IntegrationSystem',
      entityId: id,
      metadata: dto,
    });
    return system;
  }

  async remove(userId: string, id: string, workspaceId: string) {
    await this.db.integrationSystem.delete({ where: { id } });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'DELETE',
      entityType: 'IntegrationSystem',
      entityId: id,
    });
    return { deleted: true };
  }
}
