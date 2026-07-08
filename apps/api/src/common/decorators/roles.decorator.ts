import { SetMetadata } from '@nestjs/common';
import type { WorkspaceRole } from '@developer-playground/shared-types';

export const ROLES_KEY = 'workspace_roles';

/** Restrict a route to members holding one of the given workspace roles. */
export const Roles = (...roles: WorkspaceRole[]) =>
  SetMetadata(ROLES_KEY, roles);
