import { renderTemplate, RenderContext } from './index';

const ctx: RenderContext = {
  request: {
    id: 'req_123',
    body: { externalId: 'ORD-1', amount: 15000, customer: { phone: '+255677' } },
    query: { status: 'SUCCESS' },
    params: { transactionId: 'txn_9' },
    headers: { 'X-API-Key': 'sandbox_key_123', 'content-type': 'application/json' },
  },
  response: { body: { transactionId: 'abc-def' } },
  environment: { region: 'uat', currency: 'TZS' },
  system: { name: 'AzamPay Checkout' },
};

describe('renderTemplate — built-in generators', () => {
  it('generates a uuid', () => {
    const out = renderTemplate('{{uuid}}', ctx) as string;
    expect(out).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('renders now as ISO string', () => {
    const out = renderTemplate('{{now}}', ctx) as string;
    expect(new Date(out).toISOString()).toBe(out);
  });

  it('renders timestamp as unix seconds (number type preserved)', () => {
    const out = renderTemplate('{{timestamp}}', ctx);
    expect(typeof out).toBe('number');
    expect(out as number).toBeGreaterThan(1_000_000_000);
  });

  it('renders randomNumber within bounds', () => {
    for (let i = 0; i < 50; i++) {
      const out = renderTemplate('{{randomNumber:5:10}}', ctx) as number;
      expect(out).toBeGreaterThanOrEqual(5);
      expect(out).toBeLessThanOrEqual(10);
    }
  });

  it('renders randomString with requested length', () => {
    const out = renderTemplate('{{randomString:12}}', ctx) as string;
    expect(out).toHaveLength(12);
    expect(out).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe('renderTemplate — request/response/env/system paths', () => {
  it('reads request.body nested field', () => {
    expect(renderTemplate('{{request.body.externalId}}', ctx)).toBe('ORD-1');
    expect(renderTemplate('{{request.body.customer.phone}}', ctx)).toBe('+255677');
  });

  it('preserves number type for a whole-token numeric field', () => {
    expect(renderTemplate('{{request.body.amount}}', ctx)).toBe(15000);
  });

  it('reads request.query / params', () => {
    expect(renderTemplate('{{request.query.status}}', ctx)).toBe('SUCCESS');
    expect(renderTemplate('{{request.params.transactionId}}', ctx)).toBe('txn_9');
  });

  it('reads headers case-insensitively', () => {
    expect(renderTemplate('{{request.headers.x-api-key}}', ctx)).toBe('sandbox_key_123');
  });

  it('reads request.id', () => {
    expect(renderTemplate('{{request.id}}', ctx)).toBe('req_123');
  });

  it('reads environment and system values', () => {
    expect(renderTemplate('{{environment.currency}}', ctx)).toBe('TZS');
    expect(renderTemplate('{{system.name}}', ctx)).toBe('AzamPay Checkout');
  });

  it('reads response.body for webhook templates', () => {
    expect(renderTemplate('{{response.body.transactionId}}', ctx)).toBe('abc-def');
  });

  it('resolves missing paths to empty string', () => {
    expect(renderTemplate('{{request.body.nope}}', ctx)).toBe('');
    expect(renderTemplate('X={{request.body.nope}}', ctx)).toBe('X=');
  });
});

describe('renderTemplate — deep rendering', () => {
  it('renders objects and arrays recursively', () => {
    const template = {
      event: 'PAYMENT_COMPLETED',
      externalId: '{{request.body.externalId}}',
      amount: '{{request.body.amount}}',
      system: '{{system.name}}',
      items: ['{{request.query.status}}', { phone: '{{request.body.customer.phone}}' }],
    };
    const out = renderTemplate(template, ctx) as Record<string, unknown>;
    expect(out.externalId).toBe('ORD-1');
    expect(out.amount).toBe(15000);
    expect(out.system).toBe('AzamPay Checkout');
    expect((out.items as unknown[])[0]).toBe('SUCCESS');
    expect(((out.items as unknown[])[1] as Record<string, unknown>).phone).toBe('+255677');
  });

  it('interpolates mixed strings with multiple tokens', () => {
    expect(renderTemplate('ref-{{request.body.externalId}}-{{request.query.status}}', ctx)).toBe(
      'ref-ORD-1-SUCCESS',
    );
  });
});
