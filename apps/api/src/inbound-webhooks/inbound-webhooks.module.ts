import { Module } from '@nestjs/common';
import { InboundWebhooksController } from './inbound-webhooks.controller';
import { InboundWebhookReceiverController } from './inbound-webhook-receiver.controller';
import { InboundWebhooksService } from './inbound-webhooks.service';

@Module({
  controllers: [InboundWebhooksController, InboundWebhookReceiverController],
  providers: [InboundWebhooksService],
})
export class InboundWebhooksModule {}
