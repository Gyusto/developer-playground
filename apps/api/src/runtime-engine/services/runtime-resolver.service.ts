import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ApiCredential,
  ApiEndpoint,
  Environment,
  IntegrationSystem,
  ResponseRule,
  Webhook,
} from '@developer-playground/database';

interface CachedScope {
  workspaceId: string;
  workspaceSlug: string;
  system: IntegrationSystem;
  environment: Environment;
  expiresAt: number;
}

export interface ResolvedEndpoint {
  workspaceId: string;
  workspaceSlug: string;
  system: IntegrationSystem;
  environment: Environment;
  endpoint: ApiEndpoint & { rules: ResponseRule[] };
  /** Extracted path parameters from the matched endpoint path template. */
  pathParams: Record<string, string>;
}

const SCOPE_TTL_MS = 5000;

/**
 * Resolves workspace -> system -> environment -> endpoint for a runtime
 * request, matching by HTTP method and path template. The slug scope
 * resolution is cached in-memory with a short TTL (spec section 16 — indexed
 * lookup + caching); endpoints/rules are always read live so config edits
 * take effect without redeploying.
 */
@Injectable()
export class RuntimeResolverService {
  private readonly scopeCache = new Map<string, CachedScope>();

  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  /** Invalidate the slug-scope cache (used by portal edits if wired). */
  clearCache(): void {
    this.scopeCache.clear();
  }

  private async resolveScope(
    workspaceSlug: string,
    systemSlug: string,
    environmentSlug: string,
  ): Promise<CachedScope> {
    const key = `${workspaceSlug}/${systemSlug}/${environmentSlug}`;
    const cached = this.scopeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const workspace = await this.db.workspace.findUnique({
      where: { slug: workspaceSlug },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const system = await this.db.integrationSystem.findUnique({
      where: {
        workspaceId_slug: { workspaceId: workspace.id, slug: systemSlug },
      },
    });
    if (!system) throw new NotFoundException('Integration system not found');
    if (system.status !== 'ACTIVE') {
      throw new NotFoundException('Integration system is not active');
    }

    const environment = await this.db.environment.findUnique({
      where: {
        integrationSystemId_slug: {
          integrationSystemId: system.id,
          slug: environmentSlug,
        },
      },
    });
    if (!environment) throw new NotFoundException('Environment not found');
    if (!environment.isActive) {
      throw new NotFoundException('Environment is not active');
    }

    const scope: CachedScope = {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      system,
      environment,
      expiresAt: Date.now() + SCOPE_TTL_MS,
    };
    this.scopeCache.set(key, scope);
    return scope;
  }

  /** Compile an endpoint path template into a matcher regex + param names. */
  private compilePath(template: string): { re: RegExp; names: string[] } {
    const names: string[] = [];
    const normalized = template.startsWith('/') ? template : `/${template}`;
    const pattern = normalized
      .replace(/\/+$/, '')
      .split('/')
      .map((seg) => {
        if (seg.startsWith(':')) {
          names.push(seg.slice(1));
          return '([^/]+)';
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    return { re: new RegExp(`^${pattern || '/'}/?$`), names };
  }

  async resolve(
    workspaceSlug: string,
    systemSlug: string,
    environmentSlug: string,
    method: string,
    rawPath: string,
  ): Promise<ResolvedEndpoint> {
    const scope = await this.resolveScope(
      workspaceSlug,
      systemSlug,
      environmentSlug,
    );

    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

    const endpoints = await this.db.apiEndpoint.findMany({
      where: {
        environmentId: scope.environment.id,
        method: method as ApiEndpoint['method'],
        isActive: true,
      },
      include: { rules: true },
    });

    for (const endpoint of endpoints) {
      const { re, names } = this.compilePath(endpoint.path);
      const match = re.exec(path.replace(/\/+$/, '') || '/');
      if (match) {
        const pathParams: Record<string, string> = {};
        names.forEach((name, i) => {
          pathParams[name] = decodeURIComponent(match[i + 1]);
        });
        return {
          workspaceId: scope.workspaceId,
          workspaceSlug: scope.workspaceSlug,
          system: scope.system,
          environment: scope.environment,
          endpoint,
          pathParams,
        };
      }
    }

    throw new NotFoundException(
      `No endpoint matches ${method} ${path} in this environment`,
    );
  }

  async loadActiveCredentials(environmentId: string): Promise<ApiCredential[]> {
    return this.db.apiCredential.findMany({
      where: { environmentId, status: 'ACTIVE' },
    });
  }

  /** Active webhooks for the endpoint (endpoint-linked or environment-wide). */
  async loadWebhooks(
    environmentId: string,
    endpointId: string,
  ): Promise<Webhook[]> {
    return this.db.webhook.findMany({
      where: {
        environmentId,
        isActive: true,
        OR: [{ endpointId }, { endpointId: null }],
      },
    });
  }
}
