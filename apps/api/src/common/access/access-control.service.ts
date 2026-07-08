import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { WorkspaceMember } from '@developer-playground/database';

export type ResourceScopeType =
  | 'workspace'
  | 'system'
  | 'environment'
  | 'endpoint'
  | 'rule'
  | 'webhook'
  | 'credential'
  | 'inbound'
  | 'delivery'
  | 'requestLog';

/**
 * Central RBAC helper. Resolves the workspace that owns any resource and
 * verifies the acting user is a member — enforcing the acceptance criterion
 * that a user cannot reach another workspace's data.
 */
@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  /** Resolve the owning workspaceId for a resource, walking the hierarchy. */
  async resolveWorkspaceId(
    type: ResourceScopeType,
    resourceId: string,
  ): Promise<string> {
    switch (type) {
      case 'workspace': {
        const ws = await this.db.workspace.findUnique({
          where: { id: resourceId },
          select: { id: true },
        });
        if (!ws) throw new NotFoundException('Workspace not found');
        return ws.id;
      }
      case 'system': {
        const sys = await this.db.integrationSystem.findUnique({
          where: { id: resourceId },
          select: { workspaceId: true },
        });
        if (!sys) throw new NotFoundException('Integration system not found');
        return sys.workspaceId;
      }
      case 'environment': {
        const env = await this.db.environment.findUnique({
          where: { id: resourceId },
          select: { integrationSystem: { select: { workspaceId: true } } },
        });
        if (!env) throw new NotFoundException('Environment not found');
        return env.integrationSystem.workspaceId;
      }
      case 'endpoint': {
        const ep = await this.db.apiEndpoint.findUnique({
          where: { id: resourceId },
          select: {
            environment: {
              select: { integrationSystem: { select: { workspaceId: true } } },
            },
          },
        });
        if (!ep) throw new NotFoundException('Endpoint not found');
        return ep.environment.integrationSystem.workspaceId;
      }
      case 'rule': {
        const rule = await this.db.responseRule.findUnique({
          where: { id: resourceId },
          select: {
            endpoint: {
              select: {
                environment: {
                  select: {
                    integrationSystem: { select: { workspaceId: true } },
                  },
                },
              },
            },
          },
        });
        if (!rule) throw new NotFoundException('Response rule not found');
        return rule.endpoint.environment.integrationSystem.workspaceId;
      }
      case 'webhook': {
        const wh = await this.db.webhook.findUnique({
          where: { id: resourceId },
          select: {
            environment: {
              select: { integrationSystem: { select: { workspaceId: true } } },
            },
          },
        });
        if (!wh) throw new NotFoundException('Webhook not found');
        return wh.environment.integrationSystem.workspaceId;
      }
      case 'credential': {
        const cred = await this.db.apiCredential.findUnique({
          where: { id: resourceId },
          select: {
            environment: {
              select: { integrationSystem: { select: { workspaceId: true } } },
            },
          },
        });
        if (!cred) throw new NotFoundException('Credential not found');
        return cred.environment.integrationSystem.workspaceId;
      }
      case 'inbound': {
        const inb = await this.db.inboundWebhookEndpoint.findUnique({
          where: { id: resourceId },
          select: {
            environment: {
              select: { integrationSystem: { select: { workspaceId: true } } },
            },
          },
        });
        if (!inb) throw new NotFoundException('Inbound webhook not found');
        return inb.environment.integrationSystem.workspaceId;
      }
      case 'delivery': {
        const del = await this.db.webhookDelivery.findUnique({
          where: { id: resourceId },
          select: {
            webhook: {
              select: {
                environment: {
                  select: {
                    integrationSystem: { select: { workspaceId: true } },
                  },
                },
              },
            },
          },
        });
        if (!del) throw new NotFoundException('Webhook delivery not found');
        return del.webhook.environment.integrationSystem.workspaceId;
      }
      case 'requestLog': {
        const log = await this.db.requestLog.findUnique({
          where: { id: resourceId },
          select: {
            environment: {
              select: { integrationSystem: { select: { workspaceId: true } } },
            },
          },
        });
        if (!log) throw new NotFoundException('Request log not found');
        return log.environment.integrationSystem.workspaceId;
      }
      default:
        throw new NotFoundException('Unknown resource scope');
    }
  }

  async getMembership(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMember | null> {
    return this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  /** Throws 403 if the user is not a member of the workspace. */
  async assertMember(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMember> {
    const membership = await this.getMembership(userId, workspaceId);
    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return membership;
  }

  /**
   * Resolve the workspace a user is acting within for create operations.
   * Uses an explicit workspaceId when provided (membership-checked), otherwise
   * falls back to the user's first membership.
   */
  async resolveUserWorkspace(
    userId: string,
    explicitWorkspaceId?: string,
  ): Promise<string> {
    if (explicitWorkspaceId) {
      await this.assertMember(userId, explicitWorkspaceId);
      return explicitWorkspaceId;
    }
    const membership = await this.db.workspaceMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) {
      throw new ForbiddenException('User has no workspace');
    }
    return membership.workspaceId;
  }
}
