import { clearToken, getToken } from "./auth/token";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:4000";

/** Backend envelope: { success, data, meta? }. */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
  error?: { code?: string; message?: string; details?: unknown };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip attaching the bearer token (e.g. for login). */
  auth?: boolean;
  /** Return the meta object alongside data. */
  withMeta?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, auth = true, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }
  finalHeaders.set("Accept", "application/json");

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    throw new ApiError(
      e instanceof Error ? `Network error: ${e.message}` : "Network error",
      0,
      "NETWORK_ERROR",
    );
  }

  if (res.status === 401) {
    // Token invalid/expired — drop it so the guard can redirect.
    clearToken();
  }

  const text = await res.text();
  let payload: ApiEnvelope<T> | undefined;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      // Non-JSON error body.
      if (!res.ok) {
        throw new ApiError(text || res.statusText, res.status);
      }
      return undefined as T;
    }
  }

  if (!res.ok || (payload && payload.success === false)) {
    const message =
      payload?.error?.message || payload?.message || res.statusText || "Request failed";
    throw new ApiError(message, res.status, payload?.error?.code, payload?.error?.details);
  }

  // Unwrap the envelope. Fall back to the raw payload if not enveloped.
  if (payload && "data" in payload) {
    return payload.data;
  }
  return payload as unknown as T;
}

/** Variant returning the full envelope, used for paginated list endpoints. */
export async function apiFetchWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { query, auth = true, headers } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(buildUrl(path, query), { headers: finalHeaders, cache: "no-store" });
  if (res.status === 401) clearToken();
  const payload = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || payload.success === false) {
    throw new ApiError(payload?.message || res.statusText, res.status, payload?.error?.code);
  }
  return { data: payload.data, meta: payload.meta };
}
