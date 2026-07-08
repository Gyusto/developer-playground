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
  createResponseRuleSchema,
  updateResponseRuleSchema,
  type CreateResponseRuleDto,
  type UpdateResponseRuleDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { ResponseRulesService } from './response-rules.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScope } from '../common/decorators/resource-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('response-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class ResponseRulesController {
  constructor(private readonly service: ResponseRulesService) {}

  @Post('endpoints/:endpointId/response-rules')
  @ResourceScope('endpoint', 'endpointId')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('endpointId') endpointId: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(createResponseRuleSchema))
    dto: CreateResponseRuleDto,
  ) {
    return this.service.create(user.userId, endpointId, workspaceId, dto);
  }

  @Get('endpoints/:endpointId/response-rules')
  @ResourceScope('endpoint', 'endpointId')
  list(@Param('endpointId') endpointId: string) {
    return this.service.listForEndpoint(endpointId);
  }

  @Patch('response-rules/:id')
  @ResourceScope('rule', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(updateResponseRuleSchema))
    dto: UpdateResponseRuleDto,
  ) {
    return this.service.update(user.userId, id, workspaceId, dto);
  }

  @Delete('response-rules/:id')
  @ResourceScope('rule', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.remove(user.userId, id, workspaceId);
  }
}
