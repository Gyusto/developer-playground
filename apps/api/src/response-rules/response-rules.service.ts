import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateResponseRuleDto,
  UpdateResponseRuleDto,
} from '@developer-playground/validation';
import type { Prisma } from '@developer-playground/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit-logs/audit.service';

@Injectable()
export class ResponseRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  async create(
    userId: string,
    endpointId: string,
    workspaceId: string,
    dto: CreateResponseRuleDto,
  ) {
    const rule = await this.db.responseRule.create({
      data: {
        endpointId,
        name: dto.name,
        priority: dto.priority,
        conditions: dto.conditions as unknown as Prisma.InputJsonValue,
        response: dto.response as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'ResponseRule',
      entityId: rule.id,
      metadata: { name: rule.name, priority: rule.priority },
    });
    return rule;
  }

  listForEndpoint(endpointId: string) {
    return this.db.responseRule.findMany({
      where: { endpointId },
      orderBy: { priority: 'asc' },
    });
  }

  async update(
    userId: string,
    id: string,
    workspaceId: string,
    dto: UpdateResponseRuleDto,
  ) {
    const existing = await this.db.responseRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Response rule not found');

    const rule = await this.db.responseRule.update({
      where: { id },
      data: {
        name: dto.name,
        priority: dto.priority,
        conditions:
          dto.conditions !== undefined
            ? (dto.conditions as unknown as Prisma.InputJsonValue)
            : undefined,
        response:
          dto.response !== undefined
            ? (dto.response as unknown as Prisma.InputJsonValue)
            : undefined,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'UPDATE',
      entityType: 'ResponseRule',
      entityId: id,
      metadata: dto,
    });
    return rule;
  }

  async remove(userId: string, id: string, workspaceId: string) {
    await this.db.responseRule.delete({ where: { id } });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'DELETE',
      entityType: 'ResponseRule',
      entityId: id,
    });
    return { deleted: true };
  }
}
