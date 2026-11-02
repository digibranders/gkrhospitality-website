import { describe, expect, it } from 'vitest';
import { imageGallerySchema, serviceCatalogSchema } from './schema';

describe('imageGallerySchema', () => {
  const [media] = imageGallerySchema([
    {
      id: 1,
      title: 'Beverly Hilton',
      description: 'A hotel.',
      images: ['/images/gallery/Beverly Hilton/The Beverly Hilton.jpg'],
    },
  ]).associatedMedia as Record<string, string>[];

  it('encodes spaces in image URLs', () => {
    expect(media.contentUrl).toMatch(/\/Beverly%20Hilton\/The%20Beverly%20Hilton\.jpg$/);
    expect(media.thumbnailUrl).toBe(media.contentUrl);
  });

  it('does not claim a licensing page', () => {
    expect(media).not.toHaveProperty('acquireLicensePage');
  });
});

describe('serviceCatalogSchema', () => {
  it('does not put position on an Offer', () => {
    const [offer] = serviceCatalogSchema([{ title: 'Legal', description: 'Legal help.' }])
      .itemListElement as Record<string, unknown>[];
    expect(offer).not.toHaveProperty('position');
  });
});
