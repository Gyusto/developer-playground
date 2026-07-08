import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Context available to template variables (spec section 7).
 * Any missing field resolves to an empty string.
 */
export interface RenderContext {
  request?: {
    id?: string;
    body?: unknown;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  };
  /** Present when rendering webhook payloads — the simulated API response. */
  response?: {
    statusCode?: number;
    headers?: Record<string, unknown>;
    body?: unknown;
  };
  /** Environment variables (spec 3.3 `variables`). */
  environment?: Record<string, unknown>;
  /** System-level values, e.g. `{ name }`. */
  system?: Record<string, unknown>;
}

const TOKEN_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Safe deep get by dot path. Returns undefined for any missing segment. */
function getPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function randomString(length: number): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function randomNumber(min: number, max: number): number {
  if (Number.isNaN(min)) min = 0;
  if (Number.isNaN(max)) max = 1;
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Resolve a single token expression (the text between {{ }}) to a value.
 * Returns `undefined` when the token references a missing path — callers
 * then substitute an empty string.
 */
function resolveToken(expr: string, ctx: RenderContext): unknown {
  // Built-in generators.
  if (expr === 'uuid') return uuidv4();
  if (expr === 'now') return new Date().toISOString();
  if (expr === 'timestamp') return Math.floor(Date.now() / 1000);

  if (expr.startsWith('randomNumber')) {
    const [, min, max] = expr.split(':');
    return randomNumber(Number(min), Number(max));
  }
  if (expr.startsWith('randomString')) {
    const [, len] = expr.split(':');
    const n = Number(len);
    return randomString(Number.isFinite(n) && n > 0 ? Math.floor(n) : 8);
  }

  // request.id shortcut.
  if (expr === 'request.id') return ctx.request?.id;

  // Namespaced dot-path lookups.
  if (expr.startsWith('request.body')) {
    return getPath(ctx.request?.body, expr.slice('request.body'.length + 1)) ??
      (expr === 'request.body' ? ctx.request?.body : undefined);
  }
  if (expr.startsWith('request.query.')) {
    return getPath(ctx.request?.query, expr.slice('request.query.'.length));
  }
  if (expr.startsWith('request.params.')) {
    return getPath(ctx.request?.params, expr.slice('request.params.'.length));
  }
  if (expr.startsWith('request.headers.')) {
    // Header lookups are case-insensitive.
    const key = expr.slice('request.headers.'.length).toLowerCase();
    const headers = ctx.request?.headers ?? {};
    const found = Object.keys(headers).find((h) => h.toLowerCase() === key);
    return found ? headers[found] : undefined;
  }
  if (expr.startsWith('response.body')) {
    return getPath(ctx.response?.body, expr.slice('response.body'.length + 1)) ??
      (expr === 'response.body' ? ctx.response?.body : undefined);
  }
  if (expr.startsWith('environment.')) {
    return getPath(ctx.environment, expr.slice('environment.'.length));
  }
  if (expr.startsWith('system.')) {
    return getPath(ctx.system, expr.slice('system.'.length));
  }

  return undefined;
}

/** Render tokens inside a string. If the whole string is one token, the raw
 * (possibly non-string) resolved value is returned so numbers/objects keep
 * their type; otherwise the value is interpolated as a string. */
function renderString(value: string, ctx: RenderContext): unknown {
  const wholeMatch = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (wholeMatch) {
    const resolved = resolveToken(wholeMatch[1], ctx);
    return resolved === undefined ? '' : resolved;
  }

  return value.replace(TOKEN_RE, (_full, expr: string) => {
    const resolved = resolveToken(expr.trim(), ctx);
    if (resolved === undefined || resolved === null) return '';
    if (typeof resolved === 'object') return JSON.stringify(resolved);
    return String(resolved);
  });
}

/**
 * Deeply render `{{...}}` template variables in a string, object, or array.
 * Missing paths resolve to an empty string. Non-template values pass through.
 */
export function renderTemplate<T = unknown>(
  input: string | object | null | undefined,
  ctx: RenderContext = {},
): T {
  if (input === null || input === undefined) return input as T;

  if (typeof input === 'string') {
    return renderString(input, ctx) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => renderTemplate(item as never, ctx)) as T;
  }

  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      out[key] = renderTemplate(val as never, ctx);
    }
    return out as T;
  }

  // numbers, booleans, etc. pass through unchanged.
  return input as T;
}
