// Transport envelopes shared between API and clients.

/** Standard success/error envelope wrapping every portal API response. */
export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

/** Pagination wrapper for list endpoints. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Shape returned once (and only once) when a credential secret is generated. */
export interface GeneratedCredentialSecret {
  id: string;
  name: string;
  /** Plaintext token — shown a single time, never persisted. */
  secret: string;
  keyPrefix: string;
}

/** Authenticated portal user carried on the request after JWT validation. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/** JWT payload for portal auth. */
export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
