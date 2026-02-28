import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MobileBottomNav } from './MobileBottomNav';

function renderNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MobileBottomNav />
    </MemoryRouter>,
  );
}

describe('MobileBottomNav - single Home button', () => {
  it('renders exactly 1 navigation item', () => {
    renderNav();
    const nav = screen.getByRole('navigation');
    const links = nav.querySelectorAll('a');
    expect(links.length).toBe(1);
  });

  it('renders a Home item', () => {
    renderNav();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('does not render an Explore item', () => {
    renderNav();
    expect(screen.queryByText('Explore')).toBeNull();
  });

  it('does not render a Beaches item', () => {
    renderNav();
    expect(screen.queryByText('Beaches')).toBeNull();
  });

  it('does not render a Compare item', () => {
    renderNav();
    expect(screen.queryByText('Compare')).toBeNull();
  });

  // Home navigates to /discover
  it('Home link points to /discover', () => {
    renderNav();
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/discover');
  });

  // Container uses justify-center
  it('uses justify-center layout', () => {
    renderNav();
    const nav = screen.getByRole('navigation');
    const container = nav.querySelector('.flex');
    expect(container?.className).toContain('justify-center');
    expect(container?.className).not.toContain('justify-around');
  });
});
