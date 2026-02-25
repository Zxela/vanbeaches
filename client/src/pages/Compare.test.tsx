import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@van-beaches/shared', () => ({
  BEACHES: [
    {
      id: 'kitsilano',
      name: 'Kitsilano Beach',
      slug: 'kitsilano',
      location: { latitude: 49.274, longitude: -123.156 },
      tideStationId: '5cebf1de3d0f4a073c4bb943',
      webcamUrl: null,
      showWebcam: false,
      description: 'Test beach',
      amenities: {
        parking: 'free', restrooms: true, showers: true,
        lifeguard: 'seasonal', foodNearby: true, dogFriendly: false,
        wheelchairAccessible: true, volleyballCourts: 2, firepits: false,
      },
      activities: ['swimming'],
    },
    {
      id: 'english-bay',
      name: 'English Bay Beach',
      slug: 'english-bay',
      location: { latitude: 49.282, longitude: -123.141 },
      tideStationId: '5cebf1de3d0f4a073c4bb943',
      webcamUrl: null,
      showWebcam: false,
      description: 'Another beach',
      amenities: {
        parking: 'paid', restrooms: true, showers: false,
        lifeguard: 'none', foodNearby: true, dogFriendly: true,
        wheelchairAccessible: false, volleyballCourts: 0, firepits: false,
      },
      activities: ['walking'],
    },
  ],
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: () => ({
    weather: {
      beachId: 'kitsilano',
      current: { temperature: 18, condition: 'sunny', humidity: 60, windSpeed: 10, windDirection: 'N', uvIndex: 3 },
      hourly: [],
      fetchedAt: new Date().toISOString(),
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useTides', () => ({
  useTides: () => ({
    tides: {
      predictions: [{ time: new Date().toISOString(), type: 'high', height: 4.2 }],
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

function renderCompare() {
  return render(
    <MemoryRouter>
      <Compare />
    </MemoryRouter>,
  );
}

import { Compare } from './Compare';

describe('Compare page - design system overhaul (task-016)', () => {
  it('renders a BarChart3 Lucide icon in the page header', () => {
    renderCompare();
    // Lucide icons render as SVG elements; check for svg near the heading area
    const heading = screen.getByText('Compare Beaches');
    // Walk up to find the outer header div that contains both icon and heading
    const outerDiv = heading.closest('[class*="flex"]') ?? heading.parentElement?.parentElement;
    expect(outerDiv?.querySelector('svg')).toBeInTheDocument();
  });

  it('does not use gray-900 or gray-500 text classes in the header', () => {
    const { container: headerContainer } = renderCompare();
    expect(headerContainer.innerHTML).not.toMatch(/text-gray-900/);
    expect(headerContainer.innerHTML).not.toMatch(/text-gray-500/);
  });

  it('beach selector uses ocean-500 active state instead of blue-500', () => {
    const { container } = renderCompare();
    // Select a beach
    fireEvent.click(screen.getByRole('button', { name: 'Kitsilano Beach' }));
    expect(container.innerHTML).not.toContain('bg-blue-500');
    expect(container.innerHTML).toContain('ocean-500');
  });

  it('beach selector uses sand-* classes instead of gray-100/gray-700', () => {
    const { container } = renderCompare();
    expect(container.innerHTML).not.toContain('bg-gray-100');
    expect(container.innerHTML).not.toContain('bg-gray-700');
  });

  it('empty state uses Waves Lucide icon instead of emoji', () => {
    const { container } = renderCompare();
    // Empty state should be visible initially (no beaches selected)
    expect(container.innerHTML).not.toContain('🏖️');
    // There should be an svg icon in the empty state
    const emptyState = screen.getByText(/Select beaches above/);
    const emptyParent = emptyState.closest('div') ?? emptyState.parentElement;
    expect(emptyParent?.querySelector('svg')).toBeInTheDocument();
  });

  it('empty state uses Card component instead of raw gray-50/gray-800 div', () => {
    const { container } = renderCompare();
    expect(container.innerHTML).not.toContain('bg-gray-50');
    expect(container.innerHTML).not.toContain('bg-gray-800');
  });

  it('CompareCard uses Lucide weather icons instead of emoji', () => {
    renderCompare();
    // Select a beach to show CompareCard
    fireEvent.click(screen.getByRole('button', { name: 'Kitsilano Beach' }));
    // Emoji weather icons should not appear - check for no emoji sun/cloud
    const tempEl = screen.getByText(/18.*°C|°C.*18/);
    expect(tempEl).toBeInTheDocument();
    // The temperature display should exist without emoji weather icons
    const compareCardArea = screen.getByText('Weather').closest('div');
    expect(compareCardArea?.innerHTML).not.toMatch(/☀️|⛅|☁️|🌧️|⛈️|🌫️/);
  });

  it('CompareCard tide section uses TrendingUp/Down icons instead of triangle chars', () => {
    renderCompare();
    fireEvent.click(screen.getByRole('button', { name: 'Kitsilano Beach' }));
    const tideSection = screen.getByText('Next Tide').closest('div');
    expect(tideSection?.innerHTML).not.toContain('▲');
    expect(tideSection?.innerHTML).not.toContain('▼');
    // Should have an svg icon from Lucide
    expect(tideSection?.querySelector('svg')).toBeInTheDocument();
  });
});
