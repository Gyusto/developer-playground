import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createCredentialSchema,
  type CreateCredentialDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { CredentialsService } from './credentials.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScope } from '../common/decorators/resource-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class CredentialsController {
  constructor(private readonly service: CredentialsService) {}

  @Post('environments/:environmentId/credentials')
  @ResourceScope('environment', 'environmentId')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('environmentId') environmentId: string,
    @WorkspaceId() workspaceId: string,
    @Body(new ZodValidationPipe(createCredentialSchema))
    dto: CreateCredentialDto,
  ) {
    return this.service.create(user.userId, environmentId, workspaceId, dto);
  }

  @Get('environments/:environmentId/credentials')
  @ResourceScope('environment', 'environmentId')
  list(@Param('environmentId') environmentId: string) {
    return this.service.listForEnvironment(environmentId);
  }

  @Post('credentials/:id/rotate')
  @ResourceScope('credential', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  rotate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.rotate(user.userId, id, workspaceId);
  }

  @Delete('credentials/:id')
  @ResourceScope('credential', 'id')
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.revoke(user.userId, id, workspaceId);
  }
}
