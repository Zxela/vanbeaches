import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BeachAmenities } from './BeachAmenities';


const mockAmenities = {
  parking: 'free' as const,
  restrooms: true,
  showers: true,
  lifeguard: 'seasonal' as const,
  foodNearby: true,
  dogFriendly: false,
  wheelchairAccessible: true,
  volleyballCourts: 2,
  firepits: false,
};

describe('BeachAmenities', () => {
  it('wraps content in a Card component instead of raw div', () => {
    const { container } = render(<BeachAmenities amenities={mockAmenities} />);
    const html = container.innerHTML;
    expect(html).not.toContain('bg-white dark:bg-gray-800');
  });

  it('replaces gray-* color classes with sand-* equivalents', () => {
    const { container } = render(<BeachAmenities amenities={mockAmenities} />);
    const html = container.innerHTML;
    expect(html).not.toContain('text-gray-900');
    expect(html).not.toContain('bg-gray-50');
  });

  it('replaces activity tag blue-* colors with ocean-* colors', () => {
    const { container } = render(<BeachAmenities activities={['swimming', 'volleyball']} />);
    const html = container.innerHTML;
    expect(html).not.toContain('bg-blue-50');
    expect(html).not.toContain('text-blue-700');
    // Should use ocean colors instead
    expect(html).toContain('ocean');
  });

  it('renders amenity labels', () => {
    render(<BeachAmenities amenities={mockAmenities} />);
    expect(screen.getByText('Free Parking')).toBeInTheDocument();
    expect(screen.getByText('Restrooms')).toBeInTheDocument();
  });

  it('renders nothing when no amenities or activities', () => {
    const { container } = render(<BeachAmenities />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Lucide icon components instead of emoji for amenity badges', () => {
    const { container } = render(<BeachAmenities amenities={mockAmenities} />);
    const html = container.innerHTML;
    // Should not contain emoji characters used before
    expect(html).not.toContain('🅿️');
    expect(html).not.toContain('🚻');
    expect(html).not.toContain('🚿');
    expect(html).not.toContain('🛟');
    expect(html).not.toContain('🍔');
    expect(html).not.toContain('♿');
    // Should contain SVG elements from Lucide icons
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('applies bg-emerald-50 class to available amenity badges', () => {
    const { container } = render(<BeachAmenities amenities={mockAmenities} />);
    // restrooms is true (available), should have bg-emerald-50
    const emeraldBadges = container.querySelectorAll('.bg-emerald-50');
    expect(emeraldBadges.length).toBeGreaterThan(0);
  });

  it('applies bg-sand-50 and line-through classes to unavailable amenity badges', () => {
    const { container } = render(<BeachAmenities amenities={mockAmenities} />);
    // dogFriendly is false (unavailable), should have bg-sand-50 and line-through
    const sandBadges = container.querySelectorAll('.bg-sand-50');
    expect(sandBadges.length).toBeGreaterThan(0);
    const lineThroughTexts = container.querySelectorAll('.line-through');
    expect(lineThroughTexts.length).toBeGreaterThan(0);
  });
});
