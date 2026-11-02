import { afterEach, describe, expect, it } from 'vitest';
import { CONTACT_SUBMITTED_EVENT, trackContactSubmitted } from './analytics';

describe('trackContactSubmitted', () => {
  afterEach(() => {
    delete window.dataLayer;
  });

  it('pushes the event Tag Manager listens for', () => {
    window.dataLayer = [];
    trackContactSubmitted();
    expect(window.dataLayer).toEqual([{ event: CONTACT_SUBMITTED_EVENT }]);
  });

  it('does nothing when Tag Manager is not loaded', () => {
    expect(() => trackContactSubmitted()).not.toThrow();
  });
});
