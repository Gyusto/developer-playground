import 'dotenv/config';
import { createCipheriv, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src';

/**
 * Local copy of the AES-256-GCM secret encryption (mirrors the worker/API
 * `encryptSecret`). Format: `${ivHex}:${tagHex}:${cipherHex}`.
 */
function encryptSecret(plaintext: string): string {
  const key = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY || '', 'hex');
  if (key.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

async function main(): Promise<void> {
  // ---- User ----------------------------------------------------------------
  const passwordHash = bcrypt.hashSync('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@developer-playground.dev' },
    update: { name: 'Demo User', passwordHash },
    create: { email: 'demo@developer-playground.dev', name: 'Demo User', passwordHash },
  });

  // ---- Workspace + membership ---------------------------------------------
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'otapp-qa' },
    update: { name: 'Otapp QA' },
    create: { name: 'Otapp QA', slug: 'otapp-qa' },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: 'OWNER' },
    create: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
  });

  // ---- Integration system --------------------------------------------------
  const system = await prisma.integrationSystem.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'azampay-checkout' } },
    update: {
      name: 'AzamPay Checkout Sandbox',
      description: 'Mock checkout and payment callback APIs for AzamPay integration testing.',
      basePath: '/azampay',
      status: 'ACTIVE',
      createdBy: user.id,
    },
    create: {
      workspaceId: workspace.id,
      name: 'AzamPay Checkout Sandbox',
      slug: 'azampay-checkout',
      description: 'Mock checkout and payment callback APIs for AzamPay integration testing.',
      basePath: '/azampay',
      status: 'ACTIVE',
      createdBy: user.id,
    },
  });

  // ---- Environment ---------------------------------------------------------
  const environment = await prisma.environment.upsert({
    where: { integrationSystemId_slug: { integrationSystemId: system.id, slug: 'uat' } },
    update: { name: 'UAT', variables: { currency: 'TZS', region: 'uat' }, isActive: true },
    create: {
      integrationSystemId: system.id,
      name: 'UAT',
      slug: 'uat',
      variables: { currency: 'TZS', region: 'uat' },
      isActive: true,
    },
  });

  // ---- Checkout endpoint ---------------------------------------------------
  const requestSchema = {
    type: 'object',
    required: ['externalId', 'amount', 'currency', 'customer'],
    properties: {
      externalId: { type: 'string' },
      amount: { type: 'number', minimum: 1 },
      currency: { type: 'string', enum: ['TZS', 'USD'] },
      customer: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: { type: 'string', pattern: '^\\+255[0-9]{9}$' },
          name: { type: 'string' },
        },
      },
    },
  };

  const defaultResponseBody = {
    success: true,
    message: 'Payment request accepted',
    transactionId: '{{uuid}}',
    externalId: '{{request.body.externalId}}',
    status: 'PENDING',
    createdAt: '{{now}}',
  };

  const headersConfig = [{ name: 'X-API-Key', required: true, type: 'string' }];

  const endpoint = await prisma.apiEndpoint.upsert({
    where: {
      environmentId_method_path: {
        environmentId: environment.id,
        method: 'POST',
        path: '/v1/checkout',
      },
    },
    update: {
      name: 'Initiate Checkout',
      authType: 'API_KEY',
      responseMode: 'RULE_BASED',
      defaultStatusCode: 200,
      delayMs: 500,
      requestSchema,
      defaultResponseBody,
      headersConfig,
    },
    create: {
      environmentId: environment.id,
      name: 'Initiate Checkout',
      method: 'POST',
      path: '/v1/checkout',
      authType: 'API_KEY',
      responseMode: 'RULE_BASED',
      defaultStatusCode: 200,
      delayMs: 500,
      requestSchema,
      defaultResponseBody,
      headersConfig,
    },
  });

  // ---- Response rules (recreate to stay idempotent) ------------------------
  await prisma.responseRule.deleteMany({ where: { endpointId: endpoint.id } });
  await prisma.responseRule.createMany({
    data: [
      {
        endpointId: endpoint.id,
        name: 'Insufficient balance',
        priority: 1,
        conditions: [{ source: 'request.body.amount', operator: 'GREATER_THAN', value: 1000000 }],
        response: {
          statusCode: 422,
          body: {
            success: false,
            code: 'INSUFFICIENT_BALANCE',
            message: 'The account has insufficient balance.',
          },
        },
      },
      {
        endpointId: endpoint.id,
        name: 'Successful transaction',
        priority: 10,
        conditions: [],
        response: {
          statusCode: 200,
          body: {
            success: true,
            transactionId: '{{uuid}}',
            externalId: '{{request.body.externalId}}',
            status: 'PENDING',
            amount: '{{request.body.amount}}',
            currency: '{{request.body.currency}}',
            createdAt: '{{now}}',
          },
        },
      },
    ],
  });

  // ---- API credential (plaintext shown once) -------------------------------
  const apiKey = `sandbox_key_${randomBytes(12).toString('hex')}`;
  const keyPrefix = apiKey.slice(0, 20);
  const secretHash = bcrypt.hashSync(apiKey, 10);

  await prisma.apiCredential.deleteMany({
    where: { environmentId: environment.id, name: 'UAT Default Key' },
  });
  await prisma.apiCredential.create({
    data: {
      environmentId: environment.id,
      name: 'UAT Default Key',
      type: 'API_KEY',
      status: 'ACTIVE',
      keyPrefix,
      secretHash,
    },
  });

  // ---- Outbound webhook ----------------------------------------------------
  const payloadTemplate = {
    event: 'PAYMENT_COMPLETED',
    eventId: '{{uuid}}',
    system: '{{system.name}}',
    transactionId: '{{response.body.transactionId}}',
    externalId: '{{request.body.externalId}}',
    status: 'SUCCESS',
    amount: '{{request.body.amount}}',
    currency: '{{request.body.currency}}',
    occurredAt: '{{now}}',
  };

  await prisma.webhook.deleteMany({
    where: { environmentId: environment.id, endpointId: endpoint.id, triggerEvent: 'PAYMENT_COMPLETED' },
  });
  const webhook = await prisma.webhook.create({
    data: {
      environmentId: environment.id,
      endpointId: endpoint.id,
      name: 'Payment Completed Callback',
      targetUrl: 'https://client.example.com/webhooks/payment',
      method: 'POST',
      triggerEvent: 'PAYMENT_COMPLETED',
      delayMs: 10000,
      retryEnabled: true,
      maxRetries: 5,
      signatureType: 'HMAC_SHA256',
      encryptedSecret: encryptSecret('whsec_demo_secret_123'),
      payloadTemplate,
      isActive: true,
    },
  });

  // ---- Inbound webhook receiver -------------------------------------------
  const inbound = await prisma.inboundWebhookEndpoint.upsert({
    where: { environmentId_slug: { environmentId: environment.id, slug: 'payment-callback' } },
    update: { name: 'Payment Callback Receiver', expectedSignatureType: 'NONE', isActive: true },
    create: {
      environmentId: environment.id,
      name: 'Payment Callback Receiver',
      slug: 'payment-callback',
      expectedSignatureType: 'NONE',
      isActive: true,
    },
  });

  // ---- Summary -------------------------------------------------------------
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
  const runtimeUrl = `${baseUrl}/api/runtime/otapp-qa/azampay-checkout/uat/v1/checkout`;
  const receiverUrl = `${baseUrl}/api/webhook-receiver/otapp-qa/azampay-checkout/uat/payment-callback`;

  console.log('\n=== Developer Playground seed complete ===');
  console.log('User:               ', user.email, `(${user.id})`);
  console.log('Workspace:          ', workspace.slug, `(${workspace.id})`);
  console.log('IntegrationSystem:  ', system.slug, `(${system.id})`);
  console.log('Environment:        ', environment.slug, `(${environment.id})`);
  console.log('Endpoint:           ', `${endpoint.method} ${endpoint.path}`, `(${endpoint.id})`);
  console.log('Webhook:            ', webhook.name, `(${webhook.id})`);
  console.log('Inbound receiver:   ', inbound.slug, `(${inbound.id})`);
  console.log('\nRuntime URL:        ', runtimeUrl);
  console.log('Inbound receiver URL:', receiverUrl);
  console.log('\nLogin:               demo@developer-playground.dev / password123');
  console.log('API key (shown once):', apiKey);
  console.log('================================\n');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
