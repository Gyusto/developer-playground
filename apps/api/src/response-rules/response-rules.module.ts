import { Module } from '@nestjs/common';
import { ResponseRulesController } from './response-rules.controller';
import { ResponseRulesService } from './response-rules.service';

@Module({
  controllers: [ResponseRulesController],
  providers: [ResponseRulesService],
})
export class ResponseRulesModule {}
