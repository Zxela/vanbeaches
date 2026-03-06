import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { BeachNavigation } from './BeachNavigation';

// Mock BEACHES with 3 beaches covering alphabetical order scenarios
vi.mock('@van-beaches/shared', () => ({
  BEACHES: [
    { id: 'zeta-beach', name: 'Zeta Beach' },
    { id: 'alpha-beach', name: 'Alpha Beach' },
    { id: 'middle-beach', name: 'Middle Beach' },
  ],
}));

function renderComponent(beachId: string) {
  return render(
    <MemoryRouter>
      <BeachNavigation currentBeachId={beachId} />
    </MemoryRouter>,
  );
}

describe('BeachNavigation', () => {
  describe('AC-008: displays adjacent beach navigation with chevron links', () => {
    it('shows previous and next beach names for a middle beach', () => {
      renderComponent('middle-beach');

      const prevLink = screen.getByTestId('beach-nav-prev');
      const nextLink = screen.getByTestId('beach-nav-next');

      expect(prevLink).toHaveTextContent('Alpha Beach');
      expect(nextLink).toHaveTextContent('Zeta Beach');
    });

    it('links to correct beach URLs', () => {
      renderComponent('middle-beach');

      const prevLink = screen.getByTestId('beach-nav-prev');
      const nextLink = screen.getByTestId('beach-nav-next');

      expect(prevLink).toHaveAttribute('href', '/beach/alpha-beach');
      expect(nextLink).toHaveAttribute('href', '/beach/zeta-beach');
    });
  });

  describe('AC-009: wrap-around at both ends', () => {
    it('wraps previous to last beach when on the first alphabetically', () => {
      renderComponent('alpha-beach');

      const prevLink = screen.getByTestId('beach-nav-prev');
      expect(prevLink).toHaveTextContent('Zeta Beach');
      expect(prevLink).toHaveAttribute('href', '/beach/zeta-beach');
    });

    it('wraps next to first beach when on the last alphabetically', () => {
      renderComponent('zeta-beach');

      const nextLink = screen.getByTestId('beach-nav-next');
      expect(nextLink).toHaveTextContent('Alpha Beach');
      expect(nextLink).toHaveAttribute('href', '/beach/alpha-beach');
    });
  });
});
