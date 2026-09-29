import type { Metadata } from 'next';
import "@/styles/index.css";
import Navbar from '@/components/common/Navbar';
import ScrollToTop from '@/components/common/ScrollToTop';

import Footer from '@/components/common/Footer';
import MotionProvider from '@/components/common/MotionProvider';
import {
  GoogleTagManagerNoScript,
  GoogleTagManagerScript,
} from '@/components/common/GoogleTagManager';
import JsonLd from '@/components/seo/JsonLd';
import { organizationSchema, webSiteSchema } from '@/lib/schema';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  // Note: no `alternates.canonical` here. Metadata is inherited by every route,
  // so a canonical set at this level would point every page at the homepage.
  // Each page declares its own canonical.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Hospitality Consulting in New York | GKR Hospitality',
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { telephone: true, address: true, email: true },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    // `url` is intentionally omitted so each page supplies its own.
    title: 'Hospitality Consulting in New York | GKR Hospitality',
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@gkronan',
    creator: '@gkronan',
    title: 'Hospitality Consulting in New York | GKR Hospitality',
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#141414] text-white selection:bg-[#c5a059] selection:text-white overflow-x-hidden w-full" suppressHydrationWarning>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={webSiteSchema()} />
        <GoogleTagManagerNoScript />
        <GoogleTagManagerScript />
        <Toaster position="top-right" richColors />
        <ScrollToTop />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-[#c5a059] text-[#181818] px-6 py-3 font-bold rounded-sm shadow-lg border-2 border-white/20 outline-none"
        >
          Skip to Content
        </a>

        <MotionProvider>
          <Navbar />
          <main id="main-content" className="flex-grow">
            {children}
          </main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
