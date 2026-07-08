import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createIntegrationSystemSchema,
  updateIntegrationSystemSchema,
  type CreateIntegrationSystemDto,
  type UpdateIntegrationSystemDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { IntegrationSystemsService } from './integration-systems.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScope } from '../common/decorators/resource-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('integration-systems')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller('integration-systems')
export class IntegrationSystemsController {
  constructor(private readonly service: IntegrationSystemsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createIntegrationSystemSchema))
    dto: CreateIntegrationSystemDto,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.list(user.userId, workspaceId);
  }

  @Get(':id')
  @ResourceScope('system', 'id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id')
  @ResourceScope('system', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(updateIntegrationSystemSchema))
    dto: UpdateIntegrationSystemDto,
  ) {
    return this.service.update(user.userId, id, workspaceId, dto);
  }

  @Delete(':id')
  @ResourceScope('system', 'id')
  @Roles('OWNER', 'ADMIN')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.remove(user.userId, id, workspaceId);
  }
}
