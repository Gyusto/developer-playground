import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access/access-control.service';
import {
  RESOURCE_SCOPE_KEY,
  ResourceScopeMeta,
} from '../decorators/resource-scope.decorator';

/**
 * Enforces that the JWT user is a member of the workspace owning the resource
 * named by a @ResourceScope() decorator. Attaches `membership` and
 * `workspaceId` to the request for downstream RolesGuard / handlers.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly acl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<ResourceScopeMeta>(
      RESOURCE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!scope) return true; // no resource to scope-check

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string } | undefined;
    if (!user) return false;

    const resourceId = request.params?.[scope.param];
    if (!resourceId) {
      throw new BadRequestException(`Missing route param: ${scope.param}`);
    }

    const workspaceId = await this.acl.resolveWorkspaceId(
      scope.type,
      resourceId,
    );
    const membership = await this.acl.assertMember(user.userId, workspaceId);

    request.membership = membership;
    request.workspaceId = workspaceId;
    return true;
  }
}
