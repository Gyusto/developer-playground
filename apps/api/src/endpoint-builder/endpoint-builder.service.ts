import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateEndpointDto,
  TestEndpointDto,
  UpdateEndpointDto,
} from '@developer-playground/validation';
import type { Prisma } from '@developer-playground/database';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit-logs/audit.service';
import { RuntimeExecutionService } from '../runtime-engine/services/runtime-execution.service';

@Injectable()
export class EndpointBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly execution: RuntimeExecutionService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  private toData(dto: CreateEndpointDto | UpdateEndpointDto) {
    return {
      name: dto.name,
      method: dto.method,
      path: dto.path,
      description: dto.description,
      authType: dto.authType,
      headersConfig: dto.headersConfig as Prisma.InputJsonValue | undefined,
      queryConfig: dto.queryConfig as Prisma.InputJsonValue | undefined,
      pathParamsConfig: dto.pathParamsConfig as Prisma.InputJsonValue | undefined,
      requestSchema: dto.requestSchema as Prisma.InputJsonValue | undefined,
      responseMode: dto.responseMode,
      defaultStatusCode: dto.defaultStatusCode,
      defaultHeaders: dto.defaultHeaders as Prisma.InputJsonValue | undefined,
      defaultResponseBody: dto.defaultResponseBody as
        | Prisma.InputJsonValue
        | undefined,
      delayMs: dto.delayMs,
      timeoutEnabled: dto.timeoutEnabled,
      isActive: dto.isActive,
    };
  }

  async create(
    userId: string,
    environmentId: string,
    workspaceId: string,
    dto: CreateEndpointDto,
  ) {
    const clash = await this.db.apiEndpoint.findUnique({
      where: {
        environmentId_method_path: {
          environmentId,
          method: dto.method,
          path: dto.path,
        },
      },
    });
    if (clash) {
      throw new ConflictException(
        `An endpoint already exists for ${dto.method} ${dto.path}`,
      );
    }

    const endpoint = await this.db.apiEndpoint.create({
      data: {
        environmentId,
        name: dto.name,
        method: dto.method,
        path: dto.path,
        description: dto.description,
        authType: dto.authType,
        headersConfig: dto.headersConfig as Prisma.InputJsonValue | undefined,
        queryConfig: dto.queryConfig as Prisma.InputJsonValue | undefined,
        pathParamsConfig: dto.pathParamsConfig as
          | Prisma.InputJsonValue
          | undefined,
        requestSchema: dto.requestSchema as Prisma.InputJsonValue | undefined,
        responseMode: dto.responseMode,
        defaultStatusCode: dto.defaultStatusCode,
        defaultHeaders: dto.defaultHeaders as Prisma.InputJsonValue | undefined,
        defaultResponseBody: dto.defaultResponseBody as
          | Prisma.InputJsonValue
          | undefined,
        delayMs: dto.delayMs,
        timeoutEnabled: dto.timeoutEnabled,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'ApiEndpoint',
      entityId: endpoint.id,
      metadata: { method: endpoint.method, path: endpoint.path },
    });
    return endpoint;
  }

  listForEnvironment(environmentId: string) {
    return this.db.apiEndpoint.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { rules: true } } },
    });
  }

  async getOne(id: string) {
    const endpoint = await this.db.apiEndpoint.findUnique({
      where: { id },
      include: { rules: { orderBy: { priority: 'asc' } } },
    });
    if (!endpoint) throw new NotFoundException('Endpoint not found');
    return endpoint;
  }

  async update(
    userId: string,
    id: string,
    workspaceId: string,
    dto: UpdateEndpointDto,
  ) {
    const endpoint = await this.db.apiEndpoint.update({
      where: { id },
      data: { ...this.toData(dto), version: { increment: 1 } },
    });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'UPDATE',
      entityType: 'ApiEndpoint',
      entityId: id,
      metadata: dto,
    });
    return endpoint;
  }

  async remove(userId: string, id: string, workspaceId: string) {
    await this.db.apiEndpoint.delete({ where: { id } });
    await this.audit.record({
      workspaceId,
      userId,
      action: 'DELETE',
      entityType: 'ApiEndpoint',
      entityId: id,
    });
    return { deleted: true };
  }

  /** Clone an endpoint (and its rules) with a distinct path to avoid clashes. */
  async clone(userId: string, id: string, workspaceId: string) {
    const source = await this.db.apiEndpoint.findUnique({
      where: { id },
      include: { rules: true },
    });
    if (!source) throw new NotFoundException('Endpoint not found');

    let newPath = `${source.path}-copy`;
    let suffix = 1;
    while (
      await this.db.apiEndpoint.findUnique({
        where: {
          environmentId_method_path: {
            environmentId: source.environmentId,
            method: source.method,
            path: newPath,
          },
        },
      })
    ) {
      newPath = `${source.path}-copy-${suffix++}`;
    }

    const clone = await this.db.apiEndpoint.create({
      data: {
        environmentId: source.environmentId,
        name: `${source.name} (copy)`,
        method: source.method,
        path: newPath,
        description: source.description,
        authType: source.authType,
        headersConfig: source.headersConfig ?? undefined,
        queryConfig: source.queryConfig ?? undefined,
        pathParamsConfig: source.pathParamsConfig ?? undefined,
        requestSchema: source.requestSchema ?? undefined,
        responseMode: source.responseMode,
        defaultStatusCode: source.defaultStatusCode,
        defaultHeaders: source.defaultHeaders ?? undefined,
        defaultResponseBody: source.defaultResponseBody ?? undefined,
        delayMs: source.delayMs,
        timeoutEnabled: source.timeoutEnabled,
        isActive: source.isActive,
        rules: {
          create: source.rules.map((r) => ({
            name: r.name,
            priority: r.priority,
            conditions: r.conditions as Prisma.InputJsonValue,
            response: r.response as Prisma.InputJsonValue,
            isActive: r.isActive,
          })),
        },
      },
      include: { rules: true },
    });

    await this.audit.record({
      workspaceId,
      userId,
      action: 'CLONE',
      entityType: 'ApiEndpoint',
      entityId: clone.id,
      metadata: { sourceId: id },
    });
    return clone;
  }

  /** Run a request through the runtime engine without auth (portal preview). */
  async test(id: string, dto: TestEndpointDto) {
    const endpoint = await this.db.apiEndpoint.findUnique({
      where: { id },
      include: {
        environment: {
          include: { integrationSystem: { include: { workspace: true } } },
        },
      },
    });
    if (!endpoint) throw new NotFoundException('Endpoint not found');

    const env = endpoint.environment;
    const system = env.integrationSystem;
    const workspace = system.workspace;

    // Substitute provided path params into the endpoint path template.
    const params = dto.params ?? {};
    const concretePath = endpoint.path.replace(
      /:([A-Za-z0-9_]+)/g,
      (_m, name: string) => encodeURIComponent(params[name] ?? `:${name}`),
    );

    const result = await this.execution.execute({
      workspaceSlug: workspace.slug,
      systemSlug: system.slug,
      environmentSlug: env.slug,
      method: endpoint.method,
      path: concretePath.startsWith('/') ? concretePath : `/${concretePath}`,
      headers: dto.headers ?? {},
      query: (dto.query as Record<string, unknown>) ?? {},
      body: dto.body,
      rawBody: dto.body !== undefined ? JSON.stringify(dto.body) : '',
      skipAuth: true,
      fireWebhooks: false,
    });

    return {
      statusCode: result.statusCode,
      headers: result.headers,
      body: result.body,
      matchedRuleName: result.matchedRuleName,
      requestLogId: result.requestLogId,
    };
  }
}
