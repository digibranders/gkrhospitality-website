import { describe, expect, it } from 'vitest';
import { CONTACT_LIMITS, PROJECT_TYPES, ROLE_OPTIONS, validateContactSubmission } from './contact';

const valid = {
  name: 'Maria Okafor',
  email: 'maria@hotelgroup.com',
  phone: '+1 (212) 555-0134',
  company: 'Harbor Hotel Group',
  projectType: PROJECT_TYPES[0],
  role: ROLE_OPTIONS[0],
  roleDescription: '',
  message: 'We are opening a 120-room hotel next spring and need an operations plan.',
  turnstileToken: 'token-abc',
};

const errorOf = (input: unknown): string => {
  const result = validateContactSubmission(input);
  if (result.ok) throw new Error('Expected validation to fail');
  return result.field;
};

describe('validateContactSubmission', () => {
  it('accepts a normal enquiry and trims every field', () => {
    const result = validateContactSubmission({ ...valid, name: '  Maria Okafor ', message: ' Hello there. ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Maria Okafor');
      expect(result.data.message).toBe('Hello there.');
    }
  });

  it('rejects anything that is not an object of strings', () => {
    expect(validateContactSubmission(null).ok).toBe(false);
    expect(errorOf({ ...valid, name: 42 })).toBe('name');
  });

  it('requires name, a valid email, a message and a Turnstile token', () => {
    expect(errorOf({ ...valid, name: '   ' })).toBe('name');
    expect(errorOf({ ...valid, email: 'maria@' })).toBe('email');
    expect(errorOf({ ...valid, email: 'maria@hotel group.com' })).toBe('email');
    expect(errorOf({ ...valid, message: '' })).toBe('message');
    expect(errorOf({ ...valid, turnstileToken: '' })).toBe('turnstileToken');
  });

  it('only accepts the roles and project types offered on the form', () => {
    expect(errorOf({ ...valid, role: 'Hacker' })).toBe('role');
    expect(errorOf({ ...valid, projectType: '<script>' })).toBe('projectType');
  });

  it('requires a role description only when the role is Other', () => {
    expect(errorOf({ ...valid, role: 'Other', roleDescription: '' })).toBe('roleDescription');
    const result = validateContactSubmission({ ...valid, role: 'Other', roleDescription: 'Lender' });
    expect(result.ok).toBe(true);
  });

  it('caps field lengths', () => {
    expect(errorOf({ ...valid, message: 'x'.repeat(CONTACT_LIMITS.message + 1) })).toBe('message');
    expect(errorOf({ ...valid, name: 'x'.repeat(CONTACT_LIMITS.name + 1) })).toBe('name');
  });

  it('stops single-line fields from carrying line breaks or links, which the auto-reply would repeat', () => {
    expect(errorOf({ ...valid, name: 'Maria\r\nBcc: someone@example.com' })).toBe('name');
    expect(errorOf({ ...valid, name: 'Win a prize at https://spam.example' })).toBe('name');
    expect(errorOf({ ...valid, name: 'visit www.spam.example' })).toBe('name');
    expect(errorOf({ ...valid, company: 'Acme\nInjected' })).toBe('company');
  });

  it('allows ordinary punctuation and accents in names', () => {
    expect(validateContactSubmission({ ...valid, name: "José O'Neil-Smith Jr." }).ok).toBe(true);
  });

  it('allows line breaks in the message', () => {
    expect(validateContactSubmission({ ...valid, message: 'Line one.\nLine two.' }).ok).toBe(true);
  });

  it('checks the phone number loosely: digits and common separators only', () => {
    expect(validateContactSubmission({ ...valid, phone: '' }).ok).toBe(true);
    expect(errorOf({ ...valid, phone: 'call me maybe' })).toBe('phone');
  });
});
