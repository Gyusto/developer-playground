import { TemplateRendererService } from './template-renderer.service';
import type { RenderContext } from '@developer-playground/template-engine';

describe('TemplateRendererService (wiring)', () => {
  const svc = new TemplateRendererService();
  const ctx: RenderContext = {
    request: { id: 'req_1', body: { externalId: 'ORD-1', amount: 15000 } },
    system: { name: 'AzamPay' },
  };

  it('renders request/system template variables through the engine', () => {
    const out = svc.render<Record<string, unknown>>(
      {
        transactionId: '{{uuid}}',
        externalId: '{{request.body.externalId}}',
        amount: '{{request.body.amount}}',
        system: '{{system.name}}',
        requestId: '{{request.id}}',
      },
      ctx,
    );
    expect(out.externalId).toBe('ORD-1');
    expect(out.amount).toBe(15000);
    expect(out.system).toBe('AzamPay');
    expect(out.requestId).toBe('req_1');
    expect(String(out.transactionId)).toMatch(/[0-9a-f-]{36}/);
  });
});
