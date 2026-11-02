/**
 * Schema.org JSON-LD builders.
 *
 * All values come from src/lib/seo.ts and the site's own content files so the
 * structured data cannot contradict what is rendered on the page.
 */
import {
  CONTACT,
  FOUNDER,
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILES,
  absoluteUrl,
} from '@/lib/seo';

/** Stable node identifiers so schema blocks on different pages can reference each other. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const FOUNDER_ID = `${SITE_URL}/about#garrett-ronan`;

const POSTAL_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: CONTACT.streetAddress,
  addressLocality: CONTACT.addressLocality,
  addressRegion: CONTACT.addressRegion,
  postalCode: CONTACT.postalCode,
  addressCountry: CONTACT.addressCountry,
} as const;

/**
 * The primary business entity. Rendered once, in the root layout, so every page
 * carries it and every other schema block can point at it by @id.
 */
export function organizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: 'GKR Consulting',
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/Gold-logo.png'),
    },
    image: absoluteUrl(OG_IMAGE.url),
    telephone: CONTACT.phone,
    email: CONTACT.email,
    address: POSTAL_ADDRESS,
    areaServed: [
      { '@type': 'Country', name: 'United States' },
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'Ireland' },
    ],
    founder: { '@id': FOUNDER_ID },
    knowsAbout: [
      'Hospitality operations',
      'Restaurant pre-opening',
      'Hotel operations',
      'Food and beverage management',
      'Hospitality concept development',
      'Owner representation',
      'Revenue management',
      'Labor relations and union negotiations',
    ],
    sameAs: [...SOCIAL_PROFILES],
  };
}

/** Site-level entity, paired with the organization in the root layout. */
export function webSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-US',
  };
}

/** The founder, whose operating record is the firm's primary credential. */
export function founderSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': FOUNDER_ID,
    name: FOUNDER.name,
    jobTitle: FOUNDER.jobTitle,
    description: FOUNDER.description,
    url: absoluteUrl('/about'),
    worksFor: { '@id': ORGANIZATION_ID },
    alumniOf: [
      { '@type': 'Organization', name: 'BLACE' },
      { '@type': 'Organization', name: 'etc.venues' },
      { '@type': 'Organization', name: 'Starr Restaurants' },
      { '@type': 'Organization', name: 'Azumi (Zuma, Etaru, Inko Nito)' },
      { '@type': 'Organization', name: 'Waldorf Astoria' },
      { '@type': 'Organization', name: 'The Beverly Hilton' },
      { '@type': 'Organization', name: 'Boston Harbor Hotel' },
      { '@type': 'Organization', name: 'Adare Manor' },
    ],
    sameAs: [...SOCIAL_PROFILES],
  };
}

/** Service catalogue, built from the same data that renders the What We Do page. */
export function serviceCatalogSchema(
  services: readonly { title: string; description: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Hospitality consulting services',
    url: absoluteUrl('/what-we-do'),
    provider: { '@id': ORGANIZATION_ID },
    itemListElement: services.map((service) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: service.title,
        description: service.description,
        provider: { '@id': ORGANIZATION_ID },
        serviceType: service.title,
      },
    })),
  };
}

/** FAQ markup, built from the same array that renders the accordion. */
export function faqSchema(
  faqs: readonly { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/** Breadcrumb trail. Pass the trail without the home crumb; it is prepended. */
export function breadcrumbSchema(
  trail: readonly { name: string; path: string }[],
): Record<string, unknown> {
  const crumbs = [{ name: 'Home', path: '/' }, ...trail];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * Gallery contents as an ImageGallery.
 *
 * The masonry grid renders only after mount, so crawlers never see the project
 * images in the served HTML. This block states the same contents in a form
 * search engines and AI crawlers can read without executing JavaScript.
 */
export function imageGallerySchema(
  items: readonly {
    id: number;
    title: string;
    description: string;
    images: string[];
  }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: 'GKR Hospitality project gallery',
    description:
      'Hotels, restaurants, private members clubs and event spaces GKR Hospitality has helped open and operate.',
    url: absoluteUrl('/gallery'),
    isPartOf: { '@id': WEBSITE_ID },
    associatedMedia: items.map((item) => ({
      '@type': 'ImageObject',
      name: item.title,
      description: item.description,
      contentUrl: encodeURI(absoluteUrl(item.images[0])),
      thumbnailUrl: encodeURI(absoluteUrl(item.images[0])),
    })),
  };
}
