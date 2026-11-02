/**
 * Fixed-window rate limiter.
 *
 * shortcut: counts live in one server instance's memory, so the limit is per
 * instance and resets on a cold start. It stops a single client hammering the
 * form; move to a shared store (Redis) if abuse gets past it.
 */
export interface RateLimiter {
  /** Records an attempt and returns whether it is within the limit. */
  allow(key: string, now?: number): boolean;
  reset(): void;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const windows = new Map<string, { startedAt: number; count: number }>();

  return {
    allow(key, now = Date.now()) {
      for (const [storedKey, window] of windows) {
        if (now - window.startedAt >= windowMs) windows.delete(storedKey);
      }
      const current = windows.get(key);
      if (!current) {
        windows.set(key, { startedAt: now, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
    reset() {
      windows.clear();
    },
  };
}

/** Five enquiries per visitor every ten minutes is well beyond real use of the contact form. */
export const contactFormLimiter = createRateLimiter(5, 10 * 60 * 1000);
