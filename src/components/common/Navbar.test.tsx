import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Navbar from './Navbar';
import { describe, it, expect, vi } from 'vitest';
import type { ImgHTMLAttributes, ComponentPropsWithoutRef } from 'react';

// Mocks
vi.mock('lucide-react', () => ({
  Menu: () => <div data-testid="menu-icon" />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt} />,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentPropsWithoutRef<'button'>) => <button {...props}>{children}</button>,
}));

describe('Navbar Component', () => {
  it('renders navigation links', async () => {
    render(<Navbar />);
    expect(await screen.findByText(/About Us/i)).toBeInTheDocument();
    expect(await screen.findByText(/What we do/i)).toBeInTheDocument();
    expect(await screen.findByText(/Contact/i)).toBeInTheDocument();
  });

  it('renders mobile menu button on small screens', () => {
    render(<Navbar />);
    // The menu icon is rendered initially (hidden only via CSS classes which jsdom doesn't fully simulate without layout engine,
    // but we can check if the button wrapping it exists or the icon is in the DOM)
    const menuIcon = screen.getByTestId('menu-icon');
    expect(menuIcon).toBeInTheDocument();
  });

  it('moves focus into the open mobile menu, closes on Escape and returns focus', async () => {
    render(<Navbar />);
    const menuButton = screen.getByRole('button', { name: 'Open main menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);
    const dialog = await screen.findByRole('dialog', { name: 'Main menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(menuButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps Tab inside the open mobile menu', async () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open main menu' }));
    const close = await screen.findByRole('button', { name: 'Close menu' });
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Main menu' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).not.toBe(close);
  });

  it('opens mobile menu when menu button is clicked', async () => {
    render(<Navbar />);
    const menuButton = screen.getByTestId('menu-icon').parentElement;
    if (menuButton) {
      fireEvent.click(menuButton);
      // Check for a link that should be visible in the mobile menu (like "About Us")
      const mobileAboutLink = await screen.findAllByText(/About Us/i);
      expect(mobileAboutLink.length).toBeGreaterThan(0);
    }
  });
});
