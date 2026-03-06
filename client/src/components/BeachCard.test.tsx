import { render, screen } from '@testing-library/react';
import type { Beach, BeachSummary } from '@van-beaches/shared';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useFavorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    toggleFavorite: vi.fn(),
    isFavorite: vi.fn(() => false),
  })),
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
  currentWeather: { temperature: 22, condition: 'sunny', icon: 'sunny' },
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
  it('renders the beach name', () => {
    renderCard(mockBeach, mockConditions);
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
  });

  it('renders a link to the beach detail page', () => {
    renderCard(mockBeach, mockConditions);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/beach/kitsilano-beach');
  });

  it('renders a VerdictBadge when weather conditions are provided', () => {
    renderCard(mockBeach, mockConditions);
    // sunny, 18C, good water quality -> 'perfect' verdict
    expect(screen.getByText('Perfect')).toBeInTheDocument();
  });

  it('renders a VerdictBadge with good verdict when no weather data', () => {
    renderCard(mockBeach, mockConditionsNoWeather);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders current temperature when weather is available', () => {
    renderCard(mockBeach, mockConditions);
    expect(screen.getByText(/22/)).toBeInTheDocument();
  });

  it('does not render a thumbnail image', () => {
    const { container } = renderCard(mockBeach, mockConditions);
    expect(container.querySelector('img')).toBeNull();
  });

  it('does not render a thumbnail image even when beach has images', () => {
    const { container } = renderCard(mockBeach, mockConditions);
    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('does not render a water quality dot', () => {
    const { container } = renderCard(mockBeach, mockConditions);
    expect(container.querySelector('[data-testid="water-quality-dot"]')).toBeNull();
  });

  it('does not render vibe icons', () => {
    const { container } = renderCard(mockBeach, mockConditions);
    expect(container.querySelector('[data-testid="vibe-icon"]')).toBeNull();
  });

  it('does not render a tagline', () => {
    renderCard(mockBeach, mockConditions);
    expect(screen.queryByText('Where the west side comes to play')).not.toBeInTheDocument();
  });

  it('renders gracefully when weather data is not available', () => {
    renderCard(mockBeach, mockConditionsNoWeather);
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
  });

  it('renders gracefully when beach has no images', () => {
    renderCard(mockBeachNoImages, mockConditionsNoPersonality);
    expect(screen.getByText('Unknown Beach')).toBeInTheDocument();
  });

  it('row contains exactly: beach name, verdict badge, and temperature', () => {
    const { container } = renderCard(mockBeach, mockConditions);
    const row = container.firstChild as HTMLElement;
    expect(row.querySelector('[data-testid="water-quality-dot"]')).toBeNull();
    expect(row.querySelector('img')).toBeNull();
    expect(row.querySelector('[data-testid="vibe-icon"]')).toBeNull();
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
    expect(screen.getByText('Perfect')).toBeInTheDocument();
    expect(screen.getByText(/22/)).toBeInTheDocument();
  });
});
