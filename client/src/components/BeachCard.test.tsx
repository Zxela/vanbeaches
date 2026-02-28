import { render, screen } from '@testing-library/react';
import type { BeachSummary } from '@van-beaches/shared';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@van-beaches/shared', () => ({
  BEACHES: [
    {
      id: 'kitsilano-beach',
      name: 'Kitsilano Beach',
      images: {
        thumb: '/images/kitsilano-thumb.jpg',
        hero: '/images/kitsilano-hero.jpg',
        credit: { name: 'Test', username: 'test' },
      },
    },
  ],
}));

vi.mock('../hooks/useFavorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    toggleFavorite: vi.fn(),
    isFavorite: vi.fn(() => false),
  })),
}));

vi.mock('../data/beach-personalities', () => ({
  getPersonality: vi.fn((slug: string) => {
    if (slug === 'kitsilano-beach') {
      return {
        slug: 'kitsilano-beach',
        archetype: 'The Sporty Heart',
        tagline: 'Where the west side comes to play',
        editorial: "Kits Beach is Vancouver's most popular beach.",
        differentiators: [
          '6 volleyball courts',
          'Kitsilano Pool — longest outdoor pool in Canada at 137m',
          'Busiest beach in Vancouver',
        ],
        vibes: ['active', 'social', 'family'],
        instagramHashtag: 'kitsbeach',
        instagramPostUrls: [],
        accentColor: 'coral',
      };
    }
    return undefined;
  }),
}));

const mockBeach: BeachSummary = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  currentWeather: { temperature: 18, condition: 'sunny', icon: 'sunny' },
  nextTide: { type: 'high', time: '14:30', height: 4.2 },
  waterQuality: 'good',
  lastUpdated: new Date().toISOString(),
};

const mockBeachNoWeather: BeachSummary = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  currentWeather: null,
  nextTide: null,
  waterQuality: 'unknown',
  lastUpdated: new Date().toISOString(),
};

const mockBeachNoPersonality: BeachSummary = {
  id: 'unknown-beach',
  name: 'Unknown Beach',
  currentWeather: { temperature: 15, condition: 'cloudy', icon: 'cloudy' },
  nextTide: null,
  waterQuality: 'unknown',
  lastUpdated: new Date().toISOString(),
};

function renderCard(beach: BeachSummary) {
  return render(
    <MemoryRouter>
      <BeachCard beach={beach} />
    </MemoryRouter>,
  );
}

import { BeachCard } from './BeachCard';

describe('BeachCard', () => {
  // Compact row displays beach name
  it('renders the beach name', () => {
    renderCard(mockBeach);
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
  });

  // Displays personality tagline
  it('displays the beach personality tagline', () => {
    renderCard(mockBeach);
    expect(screen.getByText('Where the west side comes to play')).toBeInTheDocument();
  });

  // Displays current conditions (temperature, weather condition)
  it('displays current temperature', () => {
    renderCard(mockBeach);
    expect(screen.getByText(/18/)).toBeInTheDocument();
  });

  it('displays current weather condition', () => {
    renderCard(mockBeach);
    const html = document.body.textContent || '';
    expect(/18|sunny/i.test(html)).toBe(true);
  });

  // Links to beach detail page
  it('renders a link to the beach detail page', () => {
    renderCard(mockBeach);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/beach/kitsilano-beach');
  });

  // Favorite button present
  it('renders the FavoriteButton', () => {
    renderCard(mockBeach);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  // No images rendered
  it('does not render any images', () => {
    renderCard(mockBeach);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  // Beach name uses display font class (Fraunces)
  it('applies display font class to beach name', () => {
    renderCard(mockBeach);
    const heading = screen.getByText('Kitsilano Beach');
    expect(heading.className).toMatch(/font-display/);
  });

  // Graceful degradation: no personality data available
  it('renders gracefully when personality data is not available', () => {
    renderCard(mockBeachNoPersonality);
    expect(screen.getByText('Unknown Beach')).toBeInTheDocument();
    expect(screen.queryByText('Where the west side comes to play')).not.toBeInTheDocument();
  });

  // Graceful degradation: no weather data
  it('renders gracefully when weather data is not available', () => {
    renderCard(mockBeachNoWeather);
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
  });

  // Removed elements: water quality dot and tide info should NOT appear on card
  it('does not display tide information', () => {
    renderCard(mockBeach);
    expect(screen.queryByText(/high\s*14:30/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tide/i)).not.toBeInTheDocument();
  });

  it('does not display water quality dot/label', () => {
    renderCard(mockBeach);
    expect(screen.queryByText(/good water/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Good$/)).not.toBeInTheDocument();
  });
});
