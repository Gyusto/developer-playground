import { SetMetadata } from '@nestjs/common';
import type { ResourceScopeType } from '../access/access-control.service';

export const RESOURCE_SCOPE_KEY = 'resource_scope';

export interface ResourceScopeMeta {
  type: ResourceScopeType;
  /** Route param name holding the resource id (default "id"). */
  param: string;
}

/**
 * Declares which route param identifies the target resource so WorkspaceGuard
 * can resolve and enforce workspace membership.
 */
export const ResourceScope = (type: ResourceScopeType, param = 'id') =>
  SetMetadata<string, ResourceScopeMeta>(RESOURCE_SCOPE_KEY, { type, param });
