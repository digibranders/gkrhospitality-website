'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import StatusPage, { primaryActionClass, secondaryActionClass } from '@/components/common/StatusPage';

/** Shown when a page fails to render. The navbar and footer stay in place. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <StatusPage
      title="Something went"
      emphasis="wrong"
      message="An unexpected error stopped this page from loading. Please try again, or head back to the homepage."
      actions={
        <>
          <button type="button" onClick={reset} className={primaryActionClass}>
            Try again
          </button>
          <Link href="/" className={secondaryActionClass}>
            Back to home
          </Link>
        </>
      }
    />
  );
}
