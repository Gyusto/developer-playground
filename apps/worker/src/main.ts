import 'dotenv/config';
import { Worker } from 'bullmq';
import { prisma } from '@developer-playground/database';
import { redisConnection, QUEUE_NAME, WORKER_CONCURRENCY } from './config';
import { processDelivery } from './processor';
import type { WebhookDeliveryJobData } from './processor';
import { closeQueue } from './queue';

function main(): void {
  const worker = new Worker<WebhookDeliveryJobData>(QUEUE_NAME, processDelivery, {
    connection: redisConnection,
    concurrency: WORKER_CONCURRENCY,
  });

  worker.on('ready', () =>
    console.log(`[worker] ready — queue "${QUEUE_NAME}" (concurrency=${WORKER_CONCURRENCY})`),
  );
  worker.on('completed', (job) =>
    console.log(`[worker] job ${job.id} completed (delivery=${job.data?.deliveryId})`),
  );
  worker.on('failed', (job, err) =>
    console.error(`[worker] job ${job?.id} failed:`, err?.message ?? err),
  );
  worker.on('error', (err) => console.error('[worker] error:', err));

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[worker] received ${signal}, shutting down...`);
    try {
      await worker.close();
      await closeQueue();
      await prisma.$disconnect();
    } catch (err) {
      console.error('[worker] error during shutdown:', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  console.log('[worker] started');
}

main();
