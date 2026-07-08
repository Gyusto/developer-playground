import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Capture the raw body (needed for HMAC signature verification) while parsing.
  const jsonLimit = config.maxJsonBodyBytes;
  app.use(
    express.json({
      limit: jsonLimit,
      verify: (req, _res, buf: Buffer) => {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

  // Security headers + strict CORS.
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  // Portal routes live under /api/v1; runtime + receiver are version-neutral
  // and resolve to /api/runtime/... and /api/webhook-receiver/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.enableShutdownHooks();

  // OpenAPI docs at /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Developer Playground API')
    .setDescription('Dynamic API Integration Sandbox — portal & runtime API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.apiPort);
  logger.log(`Developer Playground API listening on http://localhost:${config.apiPort}`);
  logger.log(`Swagger docs at http://localhost:${config.apiPort}/api/docs`);
}

void bootstrap();
