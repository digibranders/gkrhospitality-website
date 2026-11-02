'use server';

import * as Brevo from '@getbrevo/brevo';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';
import { validateContactSubmission } from '@/lib/contact';
import { contactFormLimiter } from '@/lib/rate-limit';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SENTRY_FLUSH_TIMEOUT_MS = 2000;
const FALLBACK_ERROR = 'We could not send your message. Please try again, or email connect@gkrhospitality.com.';
// Cloudflare codes caused by the visitor's token, such as an expired challenge. Any other code is our fault.
const TURNSTILE_VISITOR_CODES = new Set(['missing-input-response', 'invalid-input-response', 'timeout-or-duplicate']);

interface BrevoApiError {
  message?: string;
  statusCode?: number;
  response?: { body?: unknown };
}

type SendResult = { success: true } | { success: false; error: string };

function getBrevoErrorInfo(error: unknown): { message?: string; statusCode?: number; body?: unknown } {
  if (typeof error === 'object' && error !== null) {
    const brevoError = error as BrevoApiError;
    return { message: brevoError.message, statusCode: brevoError.statusCode, body: brevoError.response?.body };
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

/**
 * Alerts on a contact form fault. Never pass an error from Brevo here: it can carry
 * the request, which holds the visitor's details. Flushes because a serverless
 * function can freeze as soon as the action returns.
 */
async function reportFailure(error: unknown, area: 'config' | 'turnstile' | 'brevo'): Promise<void> {
  Sentry.captureException(error, { tags: { contact_form: area } });
  await Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS);
}

/** Read at call time, so configuration changes and tests do not depend on import order. */
function emailConfig() {
  const templateId = Number.parseInt(process.env.BREVO_TEMPLATE_ID ?? '', 10);
  const thankYouTemplateId = Number.parseInt(process.env.BREVO_THANK_YOU_TEMPLATE_ID ?? '', 10);
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'connect@GKRHospitality.com';
  return {
    apiKey: process.env.BREVO_API_KEY,
    templateId: Number.isNaN(templateId) ? null : templateId,
    thankYouTemplateId: Number.isNaN(thankYouTemplateId) ? null : thankYouTemplateId,
    senderName: process.env.BREVO_SENDER_NAME ?? 'GKR Hospitality',
    senderEmail,
    adminEmail: process.env.BREVO_ADMIN_EMAIL ?? senderEmail,
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY?.trim(),
  };
}

/** First address in x-forwarded-for, which Vercel sets to the visitor's IP. */
async function visitorIp(): Promise<string | undefined> {
  const forwarded = (await headers()).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || undefined;
}

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  const ip = await visitorIp();
  if (ip) body.append('remoteip', ip);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });
  if (!response.ok) {
    console.error('Turnstile verification request failed with status', response.status);
    await reportFailure(new Error(`Turnstile verification request failed with status ${response.status}`), 'turnstile');
    return false;
  }
  const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
  if (!result.success) {
    const codes = result['error-codes'] ?? [];
    console.error('Turnstile verification failed:', codes);
    if (codes.some((code) => !TURNSTILE_VISITOR_CODES.has(code))) {
      await reportFailure(new Error(`Turnstile rejected the verification request: ${codes.join(', ')}`), 'turnstile');
    }
    return false;
  }
  return true;
}

/**
 * Sends the contact form to GKR (admin template) and a thank-you to the visitor.
 * The input comes straight from the browser, so it is validated here again.
 */
export async function sendContactEmail(input: unknown): Promise<SendResult> {
  const validation = validateContactSubmission(input);
  if (!validation.ok) return { success: false, error: validation.message };
  const form = validation.data;

  // Checked before Turnstile and Brevo, so a flood costs neither of them a request.
  if (!contactFormLimiter.allow((await visitorIp()) ?? 'unknown')) {
    return { success: false, error: 'Too many messages in a short time. Please try again in a few minutes.' };
  }

  const config = emailConfig();
  if (!config.apiKey || !config.templateId || !config.turnstileSecret) {
    console.error('Contact form is missing BREVO_API_KEY, BREVO_TEMPLATE_ID or TURNSTILE_SECRET_KEY');
    await reportFailure(new Error('Contact form is missing its Brevo or Turnstile configuration'), 'config');
    return { success: false, error: FALLBACK_ERROR };
  }

  try {
    if (!(await verifyTurnstile(form.turnstileToken, config.turnstileSecret))) {
      return { success: false, error: 'The robot check expired or failed. Please complete it again and resend.' };
    }
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    await reportFailure(error, 'turnstile');
    return { success: false, error: 'The robot check could not be completed. Please try again.' };
  }

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, config.apiKey);

  const adminEmail = new Brevo.SendSmtpEmail();
  adminEmail.templateId = config.templateId;
  adminEmail.sender = { name: config.senderName, email: config.senderEmail };
  adminEmail.to = [{ email: config.adminEmail, name: config.senderName }];
  // Replying from the inbox goes straight to the visitor.
  adminEmail.replyTo = { email: form.email, name: form.name };
  adminEmail.params = {
    name: form.name,
    email: form.email,
    phone: form.phone || 'N/A',
    company: form.company || 'N/A',
    role: form.roleDescription ? `${form.role} (${form.roleDescription})` : form.role,
    projectType: form.projectType,
    message: form.message,
  };

  try {
    await apiInstance.sendTransacEmail(adminEmail);
  } catch (error: unknown) {
    const { message, statusCode, body } = getBrevoErrorInfo(error);
    console.error('Error calling Brevo API for admin email:', { message, response: body });
    await reportFailure(new Error(`Brevo admin email failed with status ${statusCode ?? 'unknown'}`), 'brevo');
    return { success: false, error: FALLBACK_ERROR };
  }

  if (config.thankYouTemplateId) {
    try {
      const thankYou = new Brevo.SendSmtpEmail();
      thankYou.to = [{ email: form.email, name: form.name }];
      // Sender and subject are set on the template in the Brevo dashboard.
      thankYou.templateId = config.thankYouTemplateId;
      thankYou.params = { name: form.name };
      await apiInstance.sendTransacEmail(thankYou);
    } catch (error: unknown) {
      // The enquiry already reached GKR, so a failed thank-you does not fail the submission.
      const { message, body } = getBrevoErrorInfo(error);
      console.error('Error sending thank-you email to visitor:', { message, response: body });
    }
  }

  return { success: true };
}
