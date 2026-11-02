import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';
import type { StaticImageData } from 'next/image';
import WhatWeDoSection from './WhatWeDoSection';

vi.mock('next/image', () => ({
  default: ({ alt }: ImgHTMLAttributes<HTMLImageElement>) => <img src="/service.jpg" alt={alt} />,
}));

const bgImage: StaticImageData = { src: '/service.jpg', width: 100, height: 100 };
const services = [
  { title: 'Legal', description: 'Legal help.', descriptionList: ['Lease review'], bgImage, anchor: 'legal' },
];

describe('WhatWeDoSection', () => {
  it('keeps the heading and list outside a real toggle button', () => {
    render(<WhatWeDoSection services={services} />);
    const toggle = screen.getByRole('button', { name: 'View services for Legal' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(toggle).queryByText('Lease review')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Legal', hidden: true })).toBeInTheDocument();
    expect(document.getElementById('legal')).toContainElement(toggle);

    const list = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(list).toContainElement(screen.getByText('Lease review'));
  });

  it('reveals the list when toggled', () => {
    render(<WhatWeDoSection services={services} />);
    const toggle = screen.getByRole('button', { name: 'View services for Legal' });
    const list = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(list).toHaveClass('invisible');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(list).not.toHaveClass('invisible');
  });
});
