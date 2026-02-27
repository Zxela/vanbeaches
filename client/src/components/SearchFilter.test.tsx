import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchFilter } from './SearchFilter';

describe('SearchFilter', () => {
  // AC1: All 10 intent pill buttons render with correct labels
  it('renders all 10 intent pill buttons with correct labels', () => {
    render(<SearchFilter onFilter={vi.fn()} />);
    expect(screen.getByText('Swimming')).toBeInTheDocument();
    expect(screen.getByText('Water sports')).toBeInTheDocument();
    expect(screen.getByText('Dog friendly')).toBeInTheDocument();
    expect(screen.getByText('Sunset')).toBeInTheDocument();
    expect(screen.getByText('Sports')).toBeInTheDocument();
    expect(screen.getByText('Bonfire')).toBeInTheDocument();
    expect(screen.getByText('Quiet escape')).toBeInTheDocument();
    expect(screen.getByText('Family day')).toBeInTheDocument();
    expect(screen.getByText('Picnic')).toBeInTheDocument();
    expect(screen.getByText('Cycling / walking')).toBeInTheDocument();
  });

  // AC2: No text input element (search bar removed)
  it('does not render a text input element (search bar removed)', () => {
    render(<SearchFilter onFilter={vi.fn()} />);
    expect(screen.queryByPlaceholderText('Search beaches...')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  // AC3: Pill container uses flex-wrap instead of overflow-x-auto
  it('pill container uses flex-wrap layout instead of overflow-x-auto', () => {
    const { container } = render(<SearchFilter onFilter={vi.fn()} />);
    const pillContainer = container.querySelector('.flex-wrap');
    expect(pillContainer).toBeInTheDocument();
    expect(pillContainer).not.toHaveClass('overflow-x-auto');
  });

  // AC4: Water sports pill calls onFilter with correct beaches
  it('tapping Water sports calls onFilter with only beaches with water sport activities', () => {
    const onFilter = vi.fn();
    render(<SearchFilter onFilter={onFilter} />);

    fireEvent.click(screen.getByText('Water sports'));

    // jericho-beach (sailing, windsurfing, kayaking), sunset-beach (kayaking, paddleboarding), spanish-banks (kiteboarding)
    const expectedIds = ['jericho-beach', 'spanish-banks', 'sunset-beach'];
    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0] as string[];
    expect(lastCall.slice().sort()).toEqual(expectedIds.sort());
  });

  // AC5: Two pills apply AND logic
  it('tapping two pills calls onFilter with only beaches matching both intents', () => {
    const onFilter = vi.fn();
    render(<SearchFilter onFilter={onFilter} />);

    // Sunset matches: english-bay, spanish-banks, third-beach
    // Bonfire matches: spanish-banks, third-beach
    // Intersection: spanish-banks, third-beach
    fireEvent.click(screen.getByText('Sunset'));
    fireEvent.click(screen.getByText('Bonfire'));

    const expectedIds = ['spanish-banks', 'third-beach'];
    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0] as string[];
    expect(lastCall.slice().sort()).toEqual(expectedIds.sort());
  });

  // AC6: No active pills → onFilter called with all 9 beach IDs
  it('when no pills are active, onFilter is called with all 9 beach IDs', () => {
    const onFilter = vi.fn();
    render(<SearchFilter onFilter={onFilter} />);

    const allBeachIds = [
      'english-bay',
      'jericho-beach',
      'kitsilano-beach',
      'locarno-beach',
      'second-beach',
      'spanish-banks',
      'sunset-beach',
      'third-beach',
      'trout-lake',
    ];

    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0] as string[];
    expect(lastCall.slice().sort()).toEqual(allBeachIds.sort());
  });

  // AC7: When no pills are active, "Showing X of Y" counter is not rendered
  it('when no pills are active, the Showing counter is not rendered', () => {
    render(<SearchFilter onFilter={vi.fn()} />);
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});
