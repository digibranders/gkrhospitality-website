declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Google Tag Manager's trigger for the GA4 generate_lead event listens for this name. */
export const CONTACT_SUBMITTED_EVENT = 'contact_form_submitted';

/** Counts a real enquiry. Does nothing if Tag Manager is disabled or blocked. */
export function trackContactSubmitted(): void {
  window.dataLayer?.push({ event: CONTACT_SUBMITTED_EVENT });
}
