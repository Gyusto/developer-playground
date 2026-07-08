import { Injectable } from '@nestjs/common';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type {
  HeaderParam,
  PathParam,
  QueryParam,
} from '@developer-playground/shared-types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

interface ValidateInput {
  headersConfig?: HeaderParam[] | null;
  queryConfig?: QueryParam[] | null;
  pathParamsConfig?: PathParam[] | null;
  requestSchema?: object | null;
  headers: Record<string, string>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
  body: unknown;
}

/**
 * Validates runtime request headers, query, path params, and body
 * (spec section 4 step 6, section 5). Body validation uses JSON Schema (ajv).
 */
@Injectable()
export class RequestValidatorService {
  private readonly ajv = addFormats(
    new Ajv({ allErrors: true, coerceTypes: false, strict: false }),
  );
  private readonly compiled = new Map<string, ValidateFunction>();

  private getValidator(schema: object): ValidateFunction {
    const key = JSON.stringify(schema);
    let validate = this.compiled.get(key);
    if (!validate) {
      validate = this.ajv.compile(schema);
      this.compiled.set(key, validate);
    }
    return validate;
  }

  private headerLookup(
    headers: Record<string, string>,
    name: string,
  ): string | undefined {
    const target = name.toLowerCase();
    const key = Object.keys(headers).find((h) => h.toLowerCase() === target);
    return key ? headers[key] : undefined;
  }

  validate(input: ValidateInput): ValidationResult {
    const errors: string[] = [];

    for (const h of input.headersConfig ?? []) {
      const value = this.headerLookup(input.headers, h.name);
      if (h.required && (value === undefined || value === '')) {
        errors.push(`Missing required header: ${h.name}`);
      } else if (
        value !== undefined &&
        h.allowedValues &&
        h.allowedValues.length > 0 &&
        !h.allowedValues.includes(value)
      ) {
        errors.push(`Header ${h.name} has a disallowed value`);
      }
    }

    for (const q of input.queryConfig ?? []) {
      const value = input.query[q.name];
      if (q.required && (value === undefined || value === '')) {
        errors.push(`Missing required query parameter: ${q.name}`);
      } else if (
        value !== undefined &&
        q.allowedValues &&
        q.allowedValues.length > 0 &&
        !q.allowedValues.includes(String(value))
      ) {
        errors.push(`Query parameter ${q.name} has a disallowed value`);
      }
    }

    for (const p of input.pathParamsConfig ?? []) {
      const value = input.params[p.name];
      if (p.required && (value === undefined || value === '')) {
        errors.push(`Missing required path parameter: ${p.name}`);
      }
    }

    if (input.requestSchema && typeof input.requestSchema === 'object') {
      const validate = this.getValidator(input.requestSchema);
      const valid = validate(input.body);
      if (!valid && validate.errors) {
        for (const e of validate.errors) {
          errors.push(`body${e.instancePath} ${e.message}`.trim());
        }
      }
    }

    return { ok: errors.length === 0, errors };
  }
}
