// Shared domain interfaces used by the API runtime, worker, and validation layer.

import type { RuleOperator } from './enums';

/** A single condition inside a ResponseRule (spec 6.2). */
export interface ResponseRuleCondition {
  /** Dot-path into the request context, e.g. "request.body.amount". */
  source: string;
  operator: RuleOperator;
  /** Comparison value. Optional for EXISTS / NOT_EXISTS. */
  value?: unknown;
}

/** Header parameter definition (spec 5.1). */
export interface HeaderParam {
  name: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  example?: string;
  allowedValues?: string[];
}

/** Query parameter definition (spec 5.2). */
export interface QueryParam {
  name: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  allowedValues?: string[];
  example?: string;
}

/** Path parameter definition (spec 5.3). */
export interface PathParam {
  name: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
}

/** A response definition — the shape stored in a rule's `response` and used as defaults. */
export interface ResponseDefinition {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
  /** When true the runtime simulates a timeout instead of responding. */
  timeout?: boolean;
}

/** A weighted random response variant (spec 6.3). */
export interface WeightedResponse {
  name?: string;
  weight: number;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: boolean;
}

/** Alias kept for spec parity ("RandomVariant"). */
export type RandomVariant = WeightedResponse;

/** A single item in a SEQUENCE response mode list (spec 6.4). */
export interface SequenceItem {
  name?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: boolean;
}

/** A full ResponseRule as persisted (conditions + response are JSON columns). */
export interface ResponseRuleConfig {
  id?: string;
  name: string;
  priority: number;
  conditions: ResponseRuleCondition[];
  response: ResponseDefinition;
  isActive?: boolean;
}
