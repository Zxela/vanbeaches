import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BeachVibe } from '../data/beach-personalities';
import * as beachPersonalities from '../data/beach-personalities';
import { PhotosTab } from './PhotosTab';

const mockedGetPersonality = vi.mocked(beachPersonalities.getPersonality);

// Mock the beach-personalities module
vi.mock('../data/beach-personalities', () => ({
  getPersonality: vi.fn(),
}));

const mockBeach = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  slug: 'kitsilano-beach',
  location: { latitude: 49.2766, longitude: -123.1617 },
  tideStationId: 'some-id',
  webcamUrl: null,
};

const mockPersonality = {
  slug: 'kitsilano-beach',
  archetype: 'The Sporty Heart',
  tagline: 'Where the west side comes to play',
  editorial: "Kits Beach is Vancouver's most popular beach",
  differentiators: ['6 volleyball courts'],
  vibes: ['active', 'social', 'family'] as BeachVibe[],
  instagramHashtag: 'kitsbeach',
  instagramPostUrls: ['https://www.instagram.com/p/ABC123/', 'https://www.instagram.com/p/DEF456/'],
  accentColor: 'coral',
};

describe('PhotosTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-001: PhotosTab renders InstagramEmbed with post URLs from beach personality data
  describe('renders InstagramEmbed with post URLs', () => {
    it('should render InstagramEmbed component', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      const { container } = render(<PhotosTab beach={mockBeach} />);
      // InstagramEmbed renders a grid
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should pass post URLs from personality to InstagramEmbed', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      render(<PhotosTab beach={mockBeach} />);
      // InstagramEmbed with post URLs shows links
      const links = screen.getAllByRole('link', { name: /view on instagram/i });
      expect(links).toHaveLength(mockPersonality.instagramPostUrls.length);
    });

    it('should pass correct post URL to InstagramEmbed', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      render(<PhotosTab beach={mockBeach} />);
      const links = screen.getAllByRole('link', { name: /view on instagram/i });
      expect(links[0]).toHaveAttribute('href', mockPersonality.instagramPostUrls[0]);
    });

    it('should use beach.id as slug for getPersonality lookup', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      render(<PhotosTab beach={mockBeach} />);
      expect(beachPersonalities.getPersonality).toHaveBeenCalledWith(mockBeach.id);
    });
  });

  // AC-002: PhotosTab displays community heading with the beach's Instagram hashtag
  describe('displays community heading with hashtag', () => {
    it('should display "Community photos" heading', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      render(<PhotosTab beach={mockBeach} />);
      expect(screen.getByText(/community photos/i)).toBeInTheDocument();
    });

    it('should display hashtag subtitle with "from #hashtag" format', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      render(<PhotosTab beach={mockBeach} />);
      // Check for "from" text and verify hashtag appears in subtitle
      expect(screen.getByText(/from/)).toBeInTheDocument();
      // Multiple hashtags exist, verify at least one
      expect(screen.getAllByText(`#${mockPersonality.instagramHashtag}`).length).toBeGreaterThan(0);
    });

    it('should include the correct hashtag in the subtitle', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      const { container } = render(<PhotosTab beach={mockBeach} />);
      // Check that the subtitle has the hashtag text node
      expect(container.textContent).toMatch(
        new RegExp(`from.*#${mockPersonality.instagramHashtag}`),
      );
    });
  });

  describe('sets honest expectations for the future gallery', () => {
    it('mentions that the gallery is curated and coming later', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      render(<PhotosTab beach={mockBeach} />);
      expect(screen.getByText(/curated gallery.*coming in a future update/i)).toBeInTheDocument();
    });

    it('does not promise automatic hashtag ingestion', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      const { container } = render(<PhotosTab beach={mockBeach} />);
      expect(container.textContent).not.toMatch(/tag.*to appear here/i);
    });
  });

  // AC-004: Handle missing personality gracefully (show generic empty state)
  describe('handles missing personality gracefully', () => {
    it('should render without crashing when personality is not found', () => {
      mockedGetPersonality.mockReturnValue(undefined);
      const { container } = render(<PhotosTab beach={mockBeach} />);
      expect(container).toBeInTheDocument();
    });

    it('should show InstagramEmbed with empty post URLs when personality not found', () => {
      mockedGetPersonality.mockReturnValue(undefined);
      render(<PhotosTab beach={mockBeach} />);
      // InstagramEmbed with empty post URLs shows generic empty state
      expect(screen.getByText(/share your photos on instagram/i)).toBeInTheDocument();
    });

    it('should use a fallback hashtag when personality not found', () => {
      mockedGetPersonality.mockReturnValue(undefined);
      const { container } = render(<PhotosTab beach={mockBeach} />);
      // Should show fallback hashtag based on beach name
      expect(container.innerHTML).toMatch(/#kitsilanobeach/i);
    });

    it('should render community photos heading even without personality', () => {
      mockedGetPersonality.mockReturnValue(undefined);
      render(<PhotosTab beach={mockBeach} />);
      expect(screen.getByText(/community photos/i)).toBeInTheDocument();
    });
  });

  // Light-mode only: verify no dark: classes
  describe('styling - light mode only', () => {
    it('should not use dark: CSS classes', () => {
      mockedGetPersonality.mockReturnValue(mockPersonality);
      const { container } = render(<PhotosTab beach={mockBeach} />);
      expect(container.innerHTML).not.toMatch(/dark:/);
    });
  });
});
