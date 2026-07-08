import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  requestLogFilterSchema,
  webhookDeliveryFilterSchema,
  type RequestLogFilterDto,
  type WebhookDeliveryFilterDto,
} from '@developer-playground/validation';
import type { AuthenticatedUser } from '@developer-playground/shared-types';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class LogsController {
  constructor(private readonly service: LogsService) {}

  @Get('request-logs')
  listRequestLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(requestLogFilterSchema))
    filter: RequestLogFilterDto,
  ) {
    return this.service.listRequestLogs(user.userId, filter);
  }

  @Get('request-logs/:id')
  getRequestLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.getRequestLog(user.userId, id);
  }

  @Get('webhook-deliveries')
  listDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(webhookDeliveryFilterSchema))
    filter: WebhookDeliveryFilterDto,
  ) {
    return this.service.listDeliveries(user.userId, filter);
  }

  @Get('webhook-deliveries/:id')
  getDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.getDelivery(user.userId, id);
  }
}
