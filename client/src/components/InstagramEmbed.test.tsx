import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InstagramEmbed } from './InstagramEmbed';

describe('InstagramEmbed', () => {
  // AC-001: renders a grid of Instagram post cards when given post URLs
  describe('with post URLs', () => {
    it('renders a grid of Instagram post cards', () => {
      const postUrls = [
        'https://www.instagram.com/p/ABC123/',
        'https://www.instagram.com/p/DEF456/',
      ];
      const { container } = render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      // 2-column grid layout
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('renders a card for each post URL', () => {
      const postUrls = [
        'https://www.instagram.com/p/ABC123/',
        'https://www.instagram.com/p/DEF456/',
        'https://www.instagram.com/p/GHI789/',
      ];
      render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      const links = screen.getAllByRole('link', { name: /view on instagram/i });
      expect(links).toHaveLength(3);
    });

    it('renders "View on Instagram" CTA for each post', () => {
      const postUrls = ['https://www.instagram.com/p/ABC123/'];
      render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      expect(screen.getByRole('link', { name: /view on instagram/i })).toBeInTheDocument();
    });

    it('opens each post URL in a new tab', () => {
      const postUrls = ['https://www.instagram.com/p/ABC123/'];
      render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      const link = screen.getByRole('link', { name: /view on instagram/i });
      expect(link).toHaveAttribute('href', postUrls[0]);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('renders an Instagram icon on each card', () => {
      const postUrls = [
        'https://www.instagram.com/p/ABC123/',
        'https://www.instagram.com/p/DEF456/',
      ];
      const { container } = render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      // Each card should have an SVG icon
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it('does not show empty state when post URLs are provided', () => {
      const postUrls = ['https://www.instagram.com/p/ABC123/'];
      render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      expect(screen.queryByText(/share your photos on instagram/i)).not.toBeInTheDocument();
    });
  });

  // AC-002: when no post URLs, shows fallback images if available
  describe('with fallback images and no post URLs', () => {
    it('renders fallback images when postUrls is empty', () => {
      const fallbackImages = ['https://example.com/beach1.jpg', 'https://example.com/beach2.jpg'];
      render(<InstagramEmbed postUrls={[]} hashtag="kitsbeach" fallbackImages={fallbackImages} />);
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
    });

    it('renders fallback images with correct src', () => {
      const fallbackImages = ['https://example.com/beach1.jpg'];
      render(<InstagramEmbed postUrls={[]} hashtag="kitsbeach" fallbackImages={fallbackImages} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', fallbackImages[0]);
    });

    it('shows fallback images in a 2-column grid', () => {
      const fallbackImages = ['https://example.com/beach1.jpg', 'https://example.com/beach2.jpg'];
      const { container } = render(
        <InstagramEmbed postUrls={[]} hashtag="kitsbeach" fallbackImages={fallbackImages} />,
      );
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('does not show empty state when fallback images are provided', () => {
      const fallbackImages = ['https://example.com/beach1.jpg'];
      render(<InstagramEmbed postUrls={[]} hashtag="kitsbeach" fallbackImages={fallbackImages} />);
      expect(screen.queryByText(/share your photos on instagram/i)).not.toBeInTheDocument();
    });
  });

  // AC-003: while loading, shows skeleton placeholders
  describe('loading state', () => {
    it('shows skeleton placeholders when loading is true', () => {
      const { container } = render(
        <InstagramEmbed postUrls={[]} hashtag="kitsbeach" loading={true} />,
      );
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('uses translucent weather surfaces for skeleton placeholders', () => {
      const { container } = render(
        <InstagramEmbed postUrls={[]} hashtag="kitsbeach" loading={true} />,
      );
      const skeletons = container.querySelectorAll('.bg-white\\/10');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows skeletons in a 2-column grid', () => {
      const { container } = render(
        <InstagramEmbed postUrls={[]} hashtag="kitsbeach" loading={true} />,
      );
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('does not show post cards when loading', () => {
      render(
        <InstagramEmbed
          postUrls={['https://www.instagram.com/p/ABC123/']}
          hashtag="kitsbeach"
          loading={true}
        />,
      );
      // Links should not appear while loading
      expect(screen.queryByRole('link', { name: /view on instagram/i })).not.toBeInTheDocument();
    });

    it('does not show empty state when loading', () => {
      render(<InstagramEmbed postUrls={[]} hashtag="kitsbeach" loading={true} />);
      expect(screen.queryByText(/share your photos on instagram/i)).not.toBeInTheDocument();
    });
  });

  // AC-004: empty state with hashtag CTA when no post URLs and no fallback images
  describe('empty state', () => {
    it('shows empty state when no post URLs and no fallback images', () => {
      render(<InstagramEmbed postUrls={[]} hashtag="kitsbeach" />);
      expect(screen.getByText(/share your photos on instagram/i)).toBeInTheDocument();
    });

    it('includes the hashtag in the empty state CTA', () => {
      render(<InstagramEmbed postUrls={[]} hashtag="kitsbeach" />);
      expect(screen.getByText(/#kitsbeach/i)).toBeInTheDocument();
    });

    it('shows empty state when postUrls is not provided', () => {
      // @ts-expect-error testing missing prop scenario
      render(<InstagramEmbed hashtag="kitsbeach" />);
      expect(screen.getByText(/share your photos on instagram/i)).toBeInTheDocument();
    });

    it('does not show empty state when loading even if no posts or fallbacks', () => {
      render(<InstagramEmbed postUrls={[]} hashtag="kitsbeach" loading={true} />);
      expect(screen.queryByText(/share your photos on instagram/i)).not.toBeInTheDocument();
    });
  });

  // Light-mode only: no dark: classes in rendered output
  describe('styling', () => {
    it('does not use dark: CSS classes', () => {
      const postUrls = ['https://www.instagram.com/p/ABC123/'];
      const { container } = render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      // Inspect class attributes for any dark: prefix
      expect(container.innerHTML).not.toMatch(/dark:/);
    });

    it('uses restrained translucent weather colors', () => {
      const postUrls = ['https://www.instagram.com/p/ABC123/'];
      const { container } = render(<InstagramEmbed postUrls={postUrls} hashtag="kitsbeach" />);
      expect(container.innerHTML).toContain('bg-white/10');
      expect(container.innerHTML).not.toMatch(/sand-|coral-/);
    });
  });
});
