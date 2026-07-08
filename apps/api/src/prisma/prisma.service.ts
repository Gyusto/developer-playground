import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@developer-playground/database';

/**
 * Thin injectable wrapper exposing the shared PrismaClient singleton
 * from @developer-playground/database. Extending the client keeps `this.<model>` ergonomics.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** The shared PrismaClient instance. */
  readonly client = prisma;

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
