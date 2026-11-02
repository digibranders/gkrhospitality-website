import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendTransacEmail = vi.fn();

vi.mock('@getbrevo/brevo', () => ({
  TransactionalEmailsApi: class {
    setApiKey = vi.fn();
    sendTransacEmail = sendTransacEmail;
  },
  TransactionalEmailsApiApiKeys: { apiKey: 0 },
  SendSmtpEmail: class {},
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }),
}));

const captureException = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException,
  flush: vi.fn(async () => true),
}));

const { sendContactEmail } = await import('./send-email');
const { contactFormLimiter } = await import('@/lib/rate-limit');

const submission = {
  name: 'Maria Okafor',
  email: 'maria@hotelgroup.com',
  phone: '',
  company: 'Harbor Hotel Group',
  projectType: 'Restaurant',
  role: 'Owner',
  roleDescription: '',
  message: 'Opening in spring.',
  turnstileToken: 'token-abc',
};

const fetchMock = vi.fn();

const errorText = (result: Awaited<ReturnType<typeof sendContactEmail>>): string =>
  result.success ? '' : result.error;

beforeEach(() => {
  vi.stubEnv('BREVO_API_KEY', 'test-brevo-key');
  vi.stubEnv('BREVO_TEMPLATE_ID', '11');
  vi.stubEnv('BREVO_THANK_YOU_TEMPLATE_ID', '12');
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-turnstile-secret');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
  sendTransacEmail.mockResolvedValue({});
  contactFormLimiter.reset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('sendContactEmail', () => {
  it('refuses a visitor who sends too many messages, before contacting Cloudflare or Brevo', async () => {
    for (let i = 0; i < 5; i += 1) await sendContactEmail(submission);
    fetchMock.mockClear();
    sendTransacEmail.mockClear();
    const result = await sendContactEmail(submission);
    expect(errorText(result)).toMatch(/too many messages/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('rejects invalid input before contacting Cloudflare or Brevo', async () => {
    const result = await sendContactEmail({ ...submission, role: 'Hacker' });
    expect(result).toEqual({ success: false, error: 'Please select your role.' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('verifies the Turnstile token with the visitor IP', async () => {
    await sendContactEmail(submission);
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(body.get('secret')).toBe('test-turnstile-secret');
    expect(body.get('response')).toBe('token-abc');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });

  it('does not send when Turnstile fails, and does not expose Cloudflare error codes', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-secret'] }), { status: 200 }),
    );
    const result = await sendContactEmail(submission);
    expect(result.success).toBe(false);
    expect(errorText(result)).not.toContain('invalid-input-secret');
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('treats an error response from Cloudflare as a failed check', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }));
    const result = await sendContactEmail(submission);
    expect(result.success).toBe(false);
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('fails closed when the Turnstile secret is missing', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    const result = await sendContactEmail(submission);
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('sends the admin email and the thank-you with trimmed, validated values', async () => {
    const result = await sendContactEmail({ ...submission, name: '  Maria Okafor  ' });
    expect(result).toEqual({ success: true });
    expect(sendTransacEmail).toHaveBeenCalledTimes(2);
    const admin = sendTransacEmail.mock.calls[0][0];
    expect(admin.templateId).toBe(11);
    expect(admin.replyTo).toEqual({ email: 'maria@hotelgroup.com', name: 'Maria Okafor' });
    expect(admin.params).toMatchObject({ name: 'Maria Okafor', phone: 'N/A', role: 'Owner', projectType: 'Restaurant' });
    expect(sendTransacEmail.mock.calls[1][0].templateId).toBe(12);
  });

  it('tells the visitor what to do when Brevo fails, without mentioning configuration', async () => {
    sendTransacEmail.mockRejectedValueOnce(new Error('401 unauthorized'));
    const result = await sendContactEmail(submission);
    expect(result.success).toBe(false);
    expect(errorText(result)).not.toMatch(/configuration/i);
  });

  describe('Sentry alerts', () => {
    it('reports a failed admin email without any visitor data', async () => {
      sendTransacEmail.mockRejectedValueOnce(
        Object.assign(new Error('HTTP request failed'), {
          statusCode: 401,
          response: { body: { message: `bad recipient ${submission.email}`, request: submission } },
        }),
      );
      await sendContactEmail(submission);

      expect(captureException).toHaveBeenCalledTimes(1);
      const [reported, context] = captureException.mock.calls[0];
      expect((reported as Error).message).toBe('Brevo admin email failed with status 401');
      expect(context).toEqual({ tags: { contact_form: 'brevo' } });

      const payload = `${(reported as Error).message} ${JSON.stringify(reported)} ${JSON.stringify(context)}`;
      for (const value of [submission.name, submission.email, submission.company, submission.message]) {
        expect(payload).not.toContain(value);
      }
    });

    it('reports Turnstile outages and rejected secrets', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }));
      await sendContactEmail(submission);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-secret'] }), { status: 200 }),
      );
      await sendContactEmail(submission);
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      await sendContactEmail(submission);

      expect(captureException).toHaveBeenCalledTimes(3);
      expect(captureException.mock.calls[1][0].message).toContain('invalid-input-secret');
    });

    it('stays quiet when a visitor only has an expired token', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] }), { status: 200 }),
      );
      await sendContactEmail(submission);
      expect(captureException).not.toHaveBeenCalled();
    });

    it('reports missing configuration', async () => {
      vi.stubEnv('BREVO_API_KEY', '');
      await sendContactEmail(submission);
      expect(captureException.mock.calls[0][1]).toEqual({ tags: { contact_form: 'config' } });
    });

    it('stays quiet on a successful send', async () => {
      await sendContactEmail(submission);
      expect(captureException).not.toHaveBeenCalled();
    });
  });
});
