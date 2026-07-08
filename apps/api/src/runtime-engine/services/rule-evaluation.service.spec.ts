import { RuleEvaluationService, EvaluableRule } from './rule-evaluation.service';
import type { RenderContext } from '@developer-playground/template-engine';

const svc = new RuleEvaluationService();

const ctx: RenderContext = {
  request: {
    body: {
      amount: 15000,
      currency: 'TZS',
      externalId: 'ORD-10001',
      tags: ['vip', 'new'],
    },
    query: { status: 'SUCCESS' },
    headers: {},
    params: {},
  },
};

function rule(
  partial: Partial<EvaluableRule> & Pick<EvaluableRule, 'conditions'>,
): EvaluableRule {
  return {
    id: partial.id ?? 'r',
    name: partial.name ?? 'rule',
    priority: partial.priority ?? 1,
    isActive: partial.isActive ?? true,
    response: partial.response ?? { statusCode: 200 },
    conditions: partial.conditions,
  };
}

describe('RuleEvaluationService — all 15 operators', () => {
  const cases: Array<[string, unknown, string, unknown, boolean]> = [
    ['request.body.currency', undefined, 'EQUALS', 'TZS', true],
    ['request.body.currency', undefined, 'NOT_EQUALS', 'USD', true],
    ['request.body.externalId', undefined, 'CONTAINS', '10001', true],
    ['request.body.externalId', undefined, 'NOT_CONTAINS', 'ZZZ', true],
    ['request.body.externalId', undefined, 'STARTS_WITH', 'ORD', true],
    ['request.body.externalId', undefined, 'ENDS_WITH', '0001', true],
    ['request.body.amount', undefined, 'GREATER_THAN', 1000, true],
    ['request.body.amount', undefined, 'GREATER_THAN_OR_EQUAL', 15000, true],
    ['request.body.amount', undefined, 'LESS_THAN', 20000, true],
    ['request.body.amount', undefined, 'LESS_THAN_OR_EQUAL', 15000, true],
    ['request.body.currency', undefined, 'EXISTS', undefined, true],
    ['request.body.missing', undefined, 'NOT_EXISTS', undefined, true],
    ['request.body.externalId', undefined, 'MATCHES_REGEX', '^ORD-\\d+$', true],
    ['request.body.currency', undefined, 'IN', ['TZS', 'USD'], true],
    ['request.body.currency', undefined, 'NOT_IN', ['EUR', 'GBP'], true],
  ];

  it.each(cases)(
    '%s %s %s -> %s',
    (source, _unused, operator, value, expected) => {
      const result = svc.evaluateCondition(
        { source, operator: operator as never, value },
        ctx,
      );
      expect(result).toBe(expected);
    },
  );

  it('CONTAINS works on arrays', () => {
    expect(
      svc.evaluateCondition(
        { source: 'request.body.tags', operator: 'CONTAINS', value: 'vip' },
        ctx,
      ),
    ).toBe(true);
  });
});

describe('RuleEvaluationService — evaluation order', () => {
  it('returns the first active matching rule by ascending priority', () => {
    const rules: EvaluableRule[] = [
      rule({
        id: 'success',
        name: 'Success',
        priority: 10,
        conditions: [],
      }),
      rule({
        id: 'insufficient',
        name: 'Insufficient balance',
        priority: 1,
        conditions: [
          { source: 'request.body.amount', operator: 'GREATER_THAN', value: 1000000 },
        ],
      }),
    ];
    // amount 15000 -> insufficient does not match -> falls to Success catch-all.
    expect(svc.evaluate(rules, ctx)?.name).toBe('Success');

    const bigCtx: RenderContext = {
      request: { body: { amount: 2_000_000 } },
    };
    expect(svc.evaluate(rules, bigCtx)?.name).toBe('Insufficient balance');
  });

  it('skips inactive rules and returns null when nothing matches', () => {
    const rules: EvaluableRule[] = [
      rule({
        id: 'x',
        priority: 1,
        isActive: false,
        conditions: [],
      }),
    ];
    expect(svc.evaluate(rules, ctx)).toBeNull();
  });
});
