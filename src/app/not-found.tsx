import type { Metadata } from 'next';
import Link from 'next/link';
import StatusPage, { primaryActionClass, secondaryActionClass } from '@/components/common/StatusPage';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <StatusPage
      title="Page not"
      emphasis="found"
      message="The page you are looking for has moved or no longer exists."
      actions={
        <>
          <Link href="/" className={primaryActionClass}>
            Back to home
          </Link>
          <Link href="/contact" className={secondaryActionClass}>
            Contact us
          </Link>
        </>
      }
    />
  );
}
