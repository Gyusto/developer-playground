import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { zWorkspaceRole } from '@developer-playground/validation';

const addMemberSchema = z.object({
  email: z.string().email(),
  role: zWorkspaceRole.default('DEVELOPER'),
});
type AddMemberDto = z.infer<typeof addMemberSchema>;

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.listForUser(user.userId);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.workspacesService.getOne(user.userId, id);
  }

  @Get(':id/members')
  members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.workspacesService.listMembers(user.userId, id);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addMemberSchema)) dto: AddMemberDto,
  ) {
    return this.workspacesService.addMember(
      user.userId,
      id,
      dto.email,
      dto.role,
    );
  }
}
