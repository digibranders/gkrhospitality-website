import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows attempts up to the limit, then refuses', () => {
    const limiter = createRateLimiter(2, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 1)).toBe(true);
    expect(limiter.allow('a', 2)).toBe(false);
  });

  it('counts each key separately', () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('b', 0)).toBe(true);
    expect(limiter.allow('a', 1)).toBe(false);
  });

  it('starts a new window once the old one has passed', () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 999)).toBe(false);
    expect(limiter.allow('a', 1000)).toBe(true);
  });
});
