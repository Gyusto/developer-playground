import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Records configuration changes into audit_logs (spec section 15). */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    workspaceId: string;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: unknown;
  }): Promise<void> {
    try {
      await this.prisma.client.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          metadata: (params.metadata as object) ?? undefined,
        },
      });
    } catch (err) {
      // Auditing must never break the primary operation.
      this.logger.warn(`Failed to write audit log: ${(err as Error).message}`);
    }
  }
}
