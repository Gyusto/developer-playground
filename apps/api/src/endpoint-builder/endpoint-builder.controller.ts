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
  createEndpointSchema,
  testEndpointSchema,
  updateEndpointSchema,
  type CreateEndpointDto,
  type TestEndpointDto,
  type UpdateEndpointDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { EndpointBuilderService } from './endpoint-builder.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScope } from '../common/decorators/resource-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('endpoints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class EndpointBuilderController {
  constructor(private readonly service: EndpointBuilderService) {}

  @Post('environments/:environmentId/endpoints')
  @ResourceScope('environment', 'environmentId')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('environmentId') environmentId: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(createEndpointSchema)) dto: CreateEndpointDto,
  ) {
    return this.service.create(user.userId, environmentId, workspaceId, dto);
  }

  @Get('environments/:environmentId/endpoints')
  @ResourceScope('environment', 'environmentId')
  list(@Param('environmentId') environmentId: string) {
    return this.service.listForEnvironment(environmentId);
  }

  @Get('endpoints/:id')
  @ResourceScope('endpoint', 'id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch('endpoints/:id')
  @ResourceScope('endpoint', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(updateEndpointSchema)) dto: UpdateEndpointDto,
  ) {
    return this.service.update(user.userId, id, workspaceId, dto);
  }

  @Delete('endpoints/:id')
  @ResourceScope('endpoint', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.remove(user.userId, id, workspaceId);
  }

  @Post('endpoints/:id/clone')
  @ResourceScope('endpoint', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  clone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.clone(user.userId, id, workspaceId);
  }

  @Post('endpoints/:id/test')
  @ResourceScope('endpoint', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER', 'QA')
  test(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(testEndpointSchema)) dto: TestEndpointDto,
  ) {
    return this.service.test(id, dto);
  }
}
