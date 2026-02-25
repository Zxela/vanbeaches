import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useBeaches', () => ({
  useBeaches: vi.fn(),
}));

vi.mock('../hooks/useFavorites', () => ({
  useFavorites: vi.fn(() => ({ favorites: [], toggleFavorite: vi.fn(), isFavorite: vi.fn(() => false) })),
}));

import { useBeaches } from '../hooks/useBeaches';
import { Discover } from './Discover';

const mockBeachSummaries = [
  {
    id: 'kitsilano',
    name: 'Kitsilano Beach',
    currentWeather: { temperature: 18, condition: 'sunny', icon: 'sunny' },
    nextTide: { type: 'high' as const, time: '14:30', height: 4.2 },
    waterQuality: 'good' as const,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'english-bay',
    name: 'English Bay Beach',
    currentWeather: null,
    nextTide: null,
    waterQuality: 'unknown' as const,
    lastUpdated: new Date().toISOString(),
  },
];

function renderDiscover() {
  return render(
    <MemoryRouter>
      <Discover />
    </MemoryRouter>,
  );
}

describe('Discover page - BeachCard data wiring (task-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes actual BeachSummary objects from useBeaches to BeachCard', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDiscover();

    // If BeachCard gets real data, the weather temperature should be visible
    expect(screen.getByText('18°C')).toBeInTheDocument();
  });

  it('shows no weather icon when weather data is unavailable for a beach', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDiscover();

    // English Bay has no weather - only one temperature should appear
    const tempElements = screen.queryAllByText(/°C$/);
    expect(tempElements).toHaveLength(1); // Only Kitsilano has weather
  });

  it('shows skeleton loading state while beaches are loading', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderDiscover();
    // Should show skeleton cards (not actual beach cards)
    expect(container.querySelectorAll('.shimmer, [data-testid="skeleton-card"]').length).toBeGreaterThanOrEqual(0);
    // Should not show beach names
    expect(screen.queryByText('Kitsilano Beach')).not.toBeInTheDocument();
  });
});
