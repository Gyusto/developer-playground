import { Module } from '@nestjs/common';
import { IntegrationSystemsController } from './integration-systems.controller';
import { IntegrationSystemsService } from './integration-systems.service';

@Module({
  controllers: [IntegrationSystemsController],
  providers: [IntegrationSystemsService],
  exports: [IntegrationSystemsService],
})
export class IntegrationSystemsModule {}
