import { Module } from '@nestjs/common';
import { RuntimeController } from './runtime.controller';
import { RuntimeExecutionService } from './services/runtime-execution.service';
import { RuntimeResolverService } from './services/runtime-resolver.service';
import { AuthenticationValidatorService } from './services/authentication-validator.service';
import { RequestValidatorService } from './services/request-validator.service';
import { RuleEvaluationService } from './services/rule-evaluation.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { ResponseSimulationService } from './services/response-simulation.service';
import { RequestLoggingService } from './services/request-logging.service';
import { WebhookDispatchService } from './services/webhook-dispatch.service';

@Module({
  controllers: [RuntimeController],
  providers: [
    RuntimeExecutionService,
    RuntimeResolverService,
    AuthenticationValidatorService,
    RequestValidatorService,
    RuleEvaluationService,
    TemplateRendererService,
    ResponseSimulationService,
    RequestLoggingService,
    WebhookDispatchService,
  ],
  exports: [
    RuntimeExecutionService,
    RuleEvaluationService,
    TemplateRendererService,
  ],
})
export class RuntimeModule {}
