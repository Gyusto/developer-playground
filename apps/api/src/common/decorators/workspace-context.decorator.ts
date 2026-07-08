import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { WorkspaceMember } from '@developer-playground/database';

/** The workspaceId resolved+authorized by WorkspaceGuard for this request. */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    return ctx.switchToHttp().getRequest().workspaceId as string;
  },
);

/** The caller's WorkspaceMember row (role) resolved by WorkspaceGuard. */
export const Membership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceMember => {
    return ctx.switchToHttp().getRequest().membership as WorkspaceMember;
  },
);
