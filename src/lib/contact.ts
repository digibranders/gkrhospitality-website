/**
 * Contact form rules, shared by the form (src/app/contact/page.tsx) and the
 * server action that sends the emails (src/app/actions/send-email.ts). The
 * server never trusts the browser: everything is checked again here.
 */

export const ROLE_OPTIONS = ['Developer', 'Investor', 'Owner', 'Exec Manager/ Operator', 'Other'] as const;

export const PROJECT_TYPES = [
  'Hotel / Resort',
  'Restaurant',
  'Bar',
  'Nightlife',
  'Meeting Event Venue',
  'Private Club',
  'Mixed-Use Residential Properties',
] as const;

export type Role = (typeof ROLE_OPTIONS)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  phone: 40,
  company: 150,
  roleDescription: 150,
  message: 5000,
  turnstileToken: 2048,
} as const;

export interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
  company: string;
  projectType: ProjectType;
  role: Role;
  roleDescription: string;
  message: string;
  turnstileToken: string;
}

export type ContactField = keyof ContactSubmission;

export type ContactValidation =
  | { ok: true; data: ContactSubmission }
  | { ok: false; field: ContactField; message: string };

// Deliberately simple: one @, no spaces, a dot in the domain. Brevo rejects
// anything it cannot deliver to, so this only needs to stop obvious junk.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+().\-\s]*$/;
const LINE_BREAK = /[\r\n]/;
// Names and companies are repeated in the auto-reply, so they must not carry links.
const LINK = /(https?:|www\.|:\/\/)/i;

function text(input: Record<string, unknown>, field: ContactField): string | undefined {
  const value = input[field] ?? '';
  return typeof value === 'string' ? value.trim() : undefined;
}

/** Validates an untrusted contact form submission. Returns the first problem found. */
export function validateContactSubmission(input: unknown): ContactValidation {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, field: 'name', message: 'The form could not be read.' };
  }
  const raw = input as Record<string, unknown>;
  const fail = (field: ContactField, message: string): ContactValidation => ({ ok: false, field, message });

  const values: Partial<Record<ContactField, string>> = {};
  for (const field of Object.keys(CONTACT_LIMITS) as (keyof typeof CONTACT_LIMITS)[]) {
    const value = text(raw, field);
    if (value === undefined) return fail(field, 'This field is not valid.');
    if (value.length > CONTACT_LIMITS[field]) {
      return fail(field, `Please keep this under ${CONTACT_LIMITS[field]} characters.`);
    }
    values[field] = value;
  }
  const role = text(raw, 'role');
  const projectType = text(raw, 'projectType');

  const { name = '', email = '', phone = '', company = '', roleDescription = '', message = '', turnstileToken = '' } =
    values;

  if (!name) return fail('name', 'Name is required.');
  if (LINE_BREAK.test(name) || LINK.test(name)) return fail('name', 'Please enter just your name.');
  if (!email || !EMAIL.test(email)) return fail('email', 'Please enter a valid email address.');
  if (!PHONE.test(phone)) return fail('phone', 'Please use digits and + ( ) - only.');
  if (LINE_BREAK.test(company) || LINK.test(company)) return fail('company', 'Please enter just the company name.');
  if (!ROLE_OPTIONS.includes(role as Role)) return fail('role', 'Please select your role.');
  if (role === 'Other' && !roleDescription) return fail('roleDescription', 'Please describe your role.');
  if (LINE_BREAK.test(roleDescription) || LINK.test(roleDescription)) {
    return fail('roleDescription', 'Please describe your role in a few words.');
  }
  if (!PROJECT_TYPES.includes(projectType as ProjectType)) return fail('projectType', 'Please select a project type.');
  if (!message) return fail('message', 'Please tell us about your situation.');
  if (!turnstileToken) return fail('turnstileToken', 'Please verify that you are not a robot.');

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      company,
      projectType: projectType as ProjectType,
      role: role as Role,
      roleDescription: role === 'Other' ? roleDescription : '',
      message,
      turnstileToken,
    },
  };
}
