import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { WorkspaceRole } from '@developer-playground/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Checks the membership role (attached by WorkspaceGuard) against the roles
 * required by @Roles(). Runs after WorkspaceGuard in the guard chain.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const membership = request.membership as
      | { role: WorkspaceRole }
      | undefined;
    if (!membership || !required.includes(membership.role)) {
      throw new ForbiddenException('Insufficient workspace role');
    }
    return true;
  }
}
