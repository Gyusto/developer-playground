/** Recommended retry backoff intervals (spec 8.1): 1m, 5m, 15m, 1h, 6h. */
export const RETRY_INTERVALS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
];

/**
 * Delay before the next retry for a 1-based attempt number. Attempt 1 uses the
 * first interval; attempts beyond the table clamp to the last (6h) interval.
 */
export function backoffDelay(attempt: number): number {
  const idx = Math.min(Math.max(attempt, 1), RETRY_INTERVALS_MS.length) - 1;
  return RETRY_INTERVALS_MS[idx];
}
