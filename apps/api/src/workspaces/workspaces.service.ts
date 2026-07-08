import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../common/access/access-control.service';
import type { WorkspaceRole } from '@developer-playground/shared-types';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acl: AccessControlService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** List workspaces the user is a member of. */
  async listForUser(userId: string) {
    const memberships = await this.db.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));
  }

  async getOne(userId: string, workspaceId: string) {
    await this.acl.assertMember(userId, workspaceId);
    const ws = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async listMembers(userId: string, workspaceId: string) {
    await this.acl.assertMember(userId, workspaceId);
    return this.db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  /** Add a member by email. Requires OWNER/ADMIN. */
  async addMember(
    userId: string,
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
  ) {
    const membership = await this.acl.assertMember(userId, workspaceId);
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only owners/admins can add members');
    }
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (existing) throw new ConflictException('User already a member');

    return this.db.workspaceMember.create({
      data: { workspaceId, userId: user.id, role },
    });
  }
}
