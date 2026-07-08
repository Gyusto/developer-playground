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
  createEnvironmentSchema,
  updateEnvironmentSchema,
  type CreateEnvironmentDto,
  type UpdateEnvironmentDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { EnvironmentsService } from './environments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScope } from '../common/decorators/resource-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('environments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class EnvironmentsController {
  constructor(private readonly service: EnvironmentsService) {}

  @Post('integration-systems/:systemId/environments')
  @ResourceScope('system', 'systemId')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemId') systemId: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(createEnvironmentSchema))
    dto: CreateEnvironmentDto,
  ) {
    return this.service.create(user.userId, systemId, workspaceId, dto);
  }

  @Get('integration-systems/:systemId/environments')
  @ResourceScope('system', 'systemId')
  list(@Param('systemId') systemId: string) {
    return this.service.listForSystem(systemId);
  }

  @Get('environments/:id')
  @ResourceScope('environment', 'id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch('environments/:id')
  @ResourceScope('environment', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(updateEnvironmentSchema))
    dto: UpdateEnvironmentDto,
  ) {
    return this.service.update(user.userId, id, workspaceId, dto);
  }

  @Delete('environments/:id')
  @ResourceScope('environment', 'id')
  @Roles('OWNER', 'ADMIN')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.remove(user.userId, id, workspaceId);
  }

  @Post('environments/:id/reset-state')
  @ResourceScope('environment', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  resetState(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.resetState(user.userId, id, workspaceId);
  }
}
