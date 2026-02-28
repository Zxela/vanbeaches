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

describe('MobileBottomNav - 2-item layout', () => {
  // AC-001: MobileBottomNav renders exactly 2 items: Home and Explore
  it('renders exactly 2 navigation items', () => {
    renderNav();
    const nav = screen.getByRole('navigation');
    // Count direct link children (Home and Explore)
    const links = nav.querySelectorAll('a');
    expect(links.length).toBe(2);
  });

  it('renders a Home item', () => {
    renderNav();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders an Explore item', () => {
    renderNav();
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });

  it('does not render a Beaches item', () => {
    renderNav();
    expect(screen.queryByText('Beaches')).toBeNull();
  });

  it('does not render a Compare item', () => {
    renderNav();
    expect(screen.queryByText('Compare')).toBeNull();
  });

  // AC-002: Home navigates to /discover
  it('Home link points to /discover', () => {
    renderNav();
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/discover');
  });

  // AC-003: Explore navigates to /discover
  it('Explore link points to /discover', () => {
    renderNav();
    const exploreLink = screen.getByText('Explore').closest('a');
    expect(exploreLink).toHaveAttribute('href', '/discover');
  });
});
