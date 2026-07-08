import { Injectable } from '@nestjs/common';
import type {
  ResponseRuleCondition,
  RuleOperator,
} from '@developer-playground/shared-types';
import type { RenderContext } from '@developer-playground/template-engine';

export interface EvaluableRule {
  id: string;
  name: string;
  priority: number;
  conditions: ResponseRuleCondition[];
  response: unknown;
  isActive: boolean;
}

export interface RuleMatch {
  id: string;
  name: string;
  response: unknown;
}

/** Deep dot-path get used to resolve a condition `source`. */
function getPath(ctx: RenderContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = ctx;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function toNumber(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

function looseEquals(actual: unknown, value: unknown): boolean {
  if (actual === value) return true;
  if (actual === null || actual === undefined) return false;
  if (typeof actual === typeof value) return false;
  return String(actual) === String(value);
}

/**
 * Evaluates ResponseRule conditions (spec 6.2). Supports all 15 operators.
 * A rule matches when EVERY condition passes; an empty condition list is a
 * catch-all (always matches).
 */
@Injectable()
export class RuleEvaluationService {
  evaluateCondition(
    condition: ResponseRuleCondition,
    ctx: RenderContext,
  ): boolean {
    const actual = getPath(ctx, condition.source);
    const { operator, value } = condition;

    switch (operator as RuleOperator) {
      case 'EQUALS':
        return looseEquals(actual, value);
      case 'NOT_EQUALS':
        return !looseEquals(actual, value);
      case 'CONTAINS':
        if (Array.isArray(actual)) return actual.some((a) => looseEquals(a, value));
        return String(actual ?? '').includes(String(value ?? ''));
      case 'NOT_CONTAINS':
        if (Array.isArray(actual)) return !actual.some((a) => looseEquals(a, value));
        return !String(actual ?? '').includes(String(value ?? ''));
      case 'STARTS_WITH':
        return String(actual ?? '').startsWith(String(value ?? ''));
      case 'ENDS_WITH':
        return String(actual ?? '').endsWith(String(value ?? ''));
      case 'GREATER_THAN':
        return toNumber(actual) > toNumber(value);
      case 'GREATER_THAN_OR_EQUAL':
        return toNumber(actual) >= toNumber(value);
      case 'LESS_THAN':
        return toNumber(actual) < toNumber(value);
      case 'LESS_THAN_OR_EQUAL':
        return toNumber(actual) <= toNumber(value);
      case 'EXISTS':
        return actual !== undefined && actual !== null;
      case 'NOT_EXISTS':
        return actual === undefined || actual === null;
      case 'MATCHES_REGEX':
        try {
          return new RegExp(String(value)).test(String(actual ?? ''));
        } catch {
          return false;
        }
      case 'IN':
        return Array.isArray(value)
          ? value.some((v) => looseEquals(actual, v))
          : false;
      case 'NOT_IN':
        return Array.isArray(value)
          ? !value.some((v) => looseEquals(actual, v))
          : true;
      default:
        return false;
    }
  }

  matchesRule(rule: EvaluableRule, ctx: RenderContext): boolean {
    if (!rule.isActive) return false;
    if (!rule.conditions || rule.conditions.length === 0) return true;
    return rule.conditions.every((c) => this.evaluateCondition(c, ctx));
  }

  /**
   * Returns the first active rule (ascending priority) whose conditions all
   * match, or null when none match (caller falls back to the default response).
   */
  evaluate(rules: EvaluableRule[], ctx: RenderContext): RuleMatch | null {
    const ordered = [...rules].sort((a, b) => a.priority - b.priority);
    for (const rule of ordered) {
      if (this.matchesRule(rule, ctx)) {
        return { id: rule.id, name: rule.name, response: rule.response };
      }
    }
    return null;
  }
}
