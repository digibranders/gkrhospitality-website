import { describe, expect, it } from 'vitest';
import robots from './robots';

describe('robots', () => {
  it('blocks the signature HTML pages by pattern, leaving the hotlinked PNGs reachable', () => {
    const rules = robots().rules;
    const { disallow } = Array.isArray(rules) ? rules[0] : rules;
    expect(disallow).toContain('/sign/*.html');
    expect(disallow).not.toContain('/sign/');
  });
});
