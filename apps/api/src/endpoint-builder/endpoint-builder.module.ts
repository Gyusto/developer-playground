import { Module } from '@nestjs/common';
import { EndpointBuilderController } from './endpoint-builder.controller';
import { EndpointBuilderService } from './endpoint-builder.service';
import { RuntimeModule } from '../runtime-engine/runtime.module';

@Module({
  imports: [RuntimeModule],
  controllers: [EndpointBuilderController],
  providers: [EndpointBuilderService],
})
export class EndpointBuilderModule {}
