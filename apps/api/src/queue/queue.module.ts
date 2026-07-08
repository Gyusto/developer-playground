import { Global, Module, Provider } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '../config/config.service';
import { WEBHOOK_QUEUE, WEBHOOK_QUEUE_TOKEN } from './queue.constants';

const webhookQueueProvider: Provider = {
  provide: WEBHOOK_QUEUE_TOKEN,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Queue =>
    new Queue(WEBHOOK_QUEUE, {
      connection: {
        host: config.redisHost,
        port: config.redisPort,
      },
    }),
};

/** Provides the shared BullMQ webhook-delivery Queue used to enqueue jobs. */
@Global()
@Module({
  providers: [webhookQueueProvider],
  exports: [webhookQueueProvider],
})
export class QueueModule {}
