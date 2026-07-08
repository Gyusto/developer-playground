import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { IntegrationSystemsModule } from './integration-systems/integration-systems.module';
import { EnvironmentsModule } from './environments/environments.module';
import { CredentialsModule } from './credentials/credentials.module';
import { EndpointBuilderModule } from './endpoint-builder/endpoint-builder.module';
import { ResponseRulesModule } from './response-rules/response-rules.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RuntimeModule } from './runtime-engine/runtime.module';
import { InboundWebhooksModule } from './inbound-webhooks/inbound-webhooks.module';
import { LogsModule } from './request-logs/logs.module';

@Module({
  imports: [
    // Infrastructure (global).
    ConfigModule,
    PrismaModule,
    CommonModule,
    QueueModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),

    // Portal (mounted under /api/v1 via URI versioning).
    AuthModule,
    UsersModule,
    WorkspacesModule,
    IntegrationSystemsModule,
    EnvironmentsModule,
    CredentialsModule,
    EndpointBuilderModule,
    ResponseRulesModule,
    WebhooksModule,
    LogsModule,

    // Public runtime + webhook receiver (version-neutral, under /api).
    RuntimeModule,
    InboundWebhooksModule,
  ],
  providers: [
    // Global rate limiting (spec section 15). Public runtime + receiver
    // controllers further tighten limits via @Throttle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
