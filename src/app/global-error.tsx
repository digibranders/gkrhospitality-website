'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import '@/styles/index.css';
import { fontVariables } from '@/lib/fonts';
import StatusPage, { primaryActionClass } from '@/components/common/StatusPage';

/**
 * Last-resort error page, used when the root layout itself fails. It replaces
 * the whole document, so it renders its own <html> and <body> and cannot rely
 * on the navbar, footer or client-side navigation.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased bg-[#181818]">
        <StatusPage
          title="Something went"
          emphasis="wrong"
          message="An unexpected error stopped the site from loading. Please try again in a moment."
          actions={
            <button type="button" onClick={reset} className={primaryActionClass}>
              Try again
            </button>
          }
        />
      </body>
    </html>
  );
}
