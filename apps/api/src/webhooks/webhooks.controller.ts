import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createWebhookSchema,
  updateWebhookSchema,
  type CreateWebhookDto,
  type UpdateWebhookDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScope } from '../common/decorators/resource-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('environments/:environmentId/webhooks')
  @ResourceScope('environment', 'environmentId')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('environmentId') environmentId: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(createWebhookSchema)) dto: CreateWebhookDto,
  ) {
    return this.service.create(user.userId, environmentId, workspaceId, dto);
  }

  @Get('environments/:environmentId/webhooks')
  @ResourceScope('environment', 'environmentId')
  list(@Param('environmentId') environmentId: string) {
    return this.service.listForEnvironment(environmentId);
  }

  @Get('webhooks/:id')
  @ResourceScope('webhook', 'id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch('webhooks/:id')
  @ResourceScope('webhook', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(updateWebhookSchema)) dto: UpdateWebhookDto,
  ) {
    return this.service.update(user.userId, id, workspaceId, dto);
  }

  @Delete('webhooks/:id')
  @ResourceScope('webhook', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.remove(user.userId, id, workspaceId);
  }

  @Post('webhooks/:id/test')
  @ResourceScope('webhook', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER', 'QA')
  test(@Param('id') id: string) {
    return this.service.test(id);
  }

  @Post('webhook-deliveries/:deliveryId/retry')
  @ResourceScope('delivery', 'deliveryId')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER', 'QA')
  retry(@Param('deliveryId') deliveryId: string) {
    return this.service.retryDelivery(deliveryId);
  }
}
