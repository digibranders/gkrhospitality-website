import type { Metadata } from 'next';
import HomeContent from '@/components/home/HomeContent';
import JsonLd from '@/components/seo/JsonLd';
import { serviceCatalogSchema } from '@/lib/schema';
import { pageMetadata, SITE_DESCRIPTION } from '@/lib/seo';
import { SERVICES_DATA } from '@/data/homeData';

export const metadata: Metadata = pageMetadata({
  // Written in full: the root layout's title template skips a page in its own segment.
  title: 'Hospitality Consulting in New York | GKR Hospitality',
  description: SITE_DESCRIPTION,
  path: '/',
  ogTitle: 'Hospitality Consulting in New York | GKR Hospitality',
});

export default function Home() {
  return (
    <>
      <JsonLd data={serviceCatalogSchema(SERVICES_DATA)} />
      <HomeContent />
    </>
  );
}
