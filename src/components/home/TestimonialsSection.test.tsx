import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TestimonialsSection from './TestimonialsSection';
import { StaticImageData } from 'next/image';

// Mock the image import
const mockImage: StaticImageData = {
  src: '/mock-image.jpg',
  height: 100,
  width: 100,
  blurDataURL: 'data:image/jpeg;base64,',
  blurWidth: 0,
  blurHeight: 0,
};

const mockTestimonials = [
  {
    quote: "Test Quote 1",
    name: "Test Name 1",
    author: "Test Author 1",
    company: "Test Company",
    logo: mockImage,
  },
  {
    quote: "Test Quote 2",
    name: "Test Name 2",
    author: "Test Author 2",
    company: "Test Company",
    logo: mockImage,
  },
];

describe('TestimonialsSection', () => {
  it('renders correctly', () => {
    render(<TestimonialsSection testimonials={mockTestimonials} />);
    expect(screen.getByText('Real Results,')).toBeDefined();
    // The component adds quotes around the text
    expect(screen.getByText('"Test Quote 1"')).toBeDefined();
  });

  it('uses grid layout for cards', () => {
    const { container } = render(<TestimonialsSection testimonials={mockTestimonials} />);
    // Check if the grid class is present on the container
    // We look for the div that contains the cards.
    // The structure is: section > div > div > div.grid
    const gridContainer = container.querySelector('.grid.grid-cols-1.place-items-center');
    expect(gridContainer).not.toBeNull();
  });

  it('gives every viewport previous and next buttons that change the testimonial', () => {
    render(<TestimonialsSection testimonials={mockTestimonials} />);
    const next = screen.getByRole('button', { name: 'Next testimonial' });
    expect(next.parentElement?.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(screen.getByText('"Test Quote 1"').closest('[animate]')).toHaveAttribute('animate', 'active');

    fireEvent.click(next);
    expect(screen.getByText('"Test Quote 2"').closest('[animate]')).toHaveAttribute('animate', 'active');
  });

  it('names the company in the logo alt text', () => {
    render(<TestimonialsSection testimonials={mockTestimonials} />);
    expect(screen.getAllByAltText('Test Company')).toHaveLength(2);
  });
});
