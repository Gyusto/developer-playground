import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createInboundWebhookSchema,
  inboundLogFilterSchema,
  type CreateInboundWebhookDto,
  type InboundLogFilterDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { InboundWebhooksService } from './inbound-webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScope } from '../common/decorators/resource-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('inbound-webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class InboundWebhooksController {
  constructor(private readonly service: InboundWebhooksService) {}

  @Post('environments/:environmentId/inbound-webhooks')
  @ResourceScope('environment', 'environmentId')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('environmentId') environmentId: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(createInboundWebhookSchema))
    dto: CreateInboundWebhookDto,
  ) {
    return this.service.create(user.userId, environmentId, workspaceId, dto);
  }

  @Get('environments/:environmentId/inbound-webhooks')
  @ResourceScope('environment', 'environmentId')
  list(@Param('environmentId') environmentId: string) {
    return this.service.listForEnvironment(environmentId);
  }

  @Get('inbound-webhook-logs')
  listLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(inboundLogFilterSchema))
    filter: InboundLogFilterDto,
  ) {
    return this.service.listLogs(user.userId, filter);
  }

  @Get('inbound-webhook-logs/:id')
  getLog(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getLog(user.userId, id);
  }

  @Post('inbound-webhook-logs/:id/replay')
  replay(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.replay(user.userId, id);
  }
}
