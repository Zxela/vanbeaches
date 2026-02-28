import { render, screen } from '@testing-library/react';
import type { Beach, BeachSummary } from '@van-beaches/shared';
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

const mockBeach: Beach = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  slug: 'kitsilano-beach',
  location: { latitude: 49.2736, longitude: -123.1534 },
  tideStationId: null,
  webcamUrl: null,
  images: {
    thumb: '/images/kitsilano-thumb.jpg',
    hero: '/images/kitsilano-hero.jpg',
    credit: { name: 'Test', username: 'test' },
  },
};

const mockConditions: BeachSummary = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  currentWeather: { temperature: 18, condition: 'sunny', icon: 'sunny' },
  nextTide: { type: 'high', time: '14:30', height: 4.2 },
  waterQuality: 'good',
  lastUpdated: new Date().toISOString(),
};

const mockConditionsNoWeather: BeachSummary = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  currentWeather: null,
  nextTide: null,
  waterQuality: 'unknown',
  lastUpdated: new Date().toISOString(),
};

const mockBeachNoImages: Beach = {
  id: 'unknown-beach',
  name: 'Unknown Beach',
  slug: 'unknown-beach',
  location: { latitude: 49.27, longitude: -123.15 },
  tideStationId: null,
  webcamUrl: null,
};

const mockConditionsNoPersonality: BeachSummary = {
  id: 'unknown-beach',
  name: 'Unknown Beach',
  currentWeather: { temperature: 15, condition: 'cloudy', icon: 'cloudy' },
  nextTide: null,
  waterQuality: 'unknown',
  lastUpdated: new Date().toISOString(),
};

function renderCard(beach: Beach, conditions?: BeachSummary, isFavorite?: boolean) {
  return render(
    <MemoryRouter>
      <BeachCard beach={beach} conditions={conditions} isFavorite={isFavorite} />
    </MemoryRouter>,
  );
}

import { BeachCard } from './BeachCard';

describe('BeachCard', () => {
  // Compact row displays beach name
  it('renders the beach name', () => {
    renderCard(mockBeach, mockConditions);
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
  });

  // Displays personality tagline
  it('displays the beach personality tagline', () => {
    renderCard(mockBeach, mockConditions);
    expect(screen.getByText('Where the west side comes to play')).toBeInTheDocument();
  });

  // Displays current conditions (temperature)
  it('displays current temperature', () => {
    renderCard(mockBeach, mockConditions);
    expect(screen.getByText(/18/)).toBeInTheDocument();
  });

  it('displays current weather condition', () => {
    renderCard(mockBeach, mockConditions);
    const html = document.body.textContent || '';
    expect(/18|sunny/i.test(html)).toBe(true);
  });

  // Links to beach detail page
  it('renders a link to the beach detail page', () => {
    renderCard(mockBeach, mockConditions);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/beach/kitsilano-beach');
  });

  // Favorite button present
  it('renders the FavoriteButton', () => {
    renderCard(mockBeach, mockConditions);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  // Thumbnail renders
  it('renders a thumbnail image', () => {
    const { container } = renderCard(mockBeach, mockConditions);
    const img = container.querySelector('img[src="/images/kitsilano-thumb.jpg"]');
    expect(img).toBeInTheDocument();
  });

  // Gradient fallback when no images
  it('renders gradient fallback when beach has no images', () => {
    const { container } = renderCard(mockBeachNoImages, mockConditionsNoPersonality);
    const img = container.querySelector('img');
    expect(img).not.toBeInTheDocument();
  });

  // Beach name uses display font class (Fraunces)
  it('applies display font class to beach name', () => {
    renderCard(mockBeach, mockConditions);
    const heading = screen.getByText('Kitsilano Beach');
    expect(heading.className).toMatch(/font-display/);
  });

  // Graceful degradation: no personality data available
  it('renders gracefully when personality data is not available', () => {
    renderCard(mockBeachNoImages, mockConditionsNoPersonality);
    expect(screen.getByText('Unknown Beach')).toBeInTheDocument();
    expect(screen.queryByText('Where the west side comes to play')).not.toBeInTheDocument();
  });

  // Graceful degradation: no weather data
  it('renders gracefully when weather data is not available', () => {
    renderCard(mockBeach, mockConditionsNoWeather);
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
  });

  // Does not display tide information
  it('does not display tide information', () => {
    renderCard(mockBeach, mockConditions);
    expect(screen.queryByText(/high\s*14:30/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tide/i)).not.toBeInTheDocument();
  });

  // Water quality dot renders
  it('displays water quality dot when quality is known', () => {
    renderCard(mockBeach, mockConditions);
    const dot = screen.getByTestId('water-quality-dot');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute('title', 'Water quality: Good');
  });

  // Vibe badges render
  it('renders vibe badges for the beach personality', () => {
    renderCard(mockBeach, mockConditions);
    // Kitsilano has vibes: ['active', 'social', 'family'] — first 2 shown
    const badges = screen.getAllByTitle(/active|social/);
    expect(badges.length).toBe(2);
  });

  // Favorite highlight styling
  it('applies favorite highlight styling when isFavorite is true', () => {
    const { container } = renderCard(mockBeach, mockConditions, true);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/bg-amber-50/);
    expect(wrapper.className).toMatch(/border-amber-400/);
  });

  it('does not apply favorite highlight styling when isFavorite is false', () => {
    const { container } = renderCard(mockBeach, mockConditions, false);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/bg-amber-50/);
  });
});
