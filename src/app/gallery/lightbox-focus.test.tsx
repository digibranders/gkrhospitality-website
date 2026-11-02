import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';
import GalleryPage from './page';
import { GALLERY_ITEMS } from '@/data/galleryData';

vi.mock('next/image', () => ({
  default: ({ alt }: ImgHTMLAttributes<HTMLImageElement>) => <img src="/gallery.jpg" alt={alt} />,
}));

describe('GalleryPage', () => {
  it('returns focus to the project that opened the lightbox', async () => {
    render(<GalleryPage />);
    const opener = screen.getByRole('button', { name: `View project: ${GALLERY_ITEMS[1].title}` });
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
