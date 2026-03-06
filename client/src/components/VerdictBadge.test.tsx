import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerdictBadge, VerdictBadgeSkeleton } from './VerdictBadge';

describe('VerdictBadge', () => {
  it('renders "Perfect" label for perfect recommendation', () => {
    render(<VerdictBadge recommendation="perfect" />);
    expect(screen.getByText('Perfect')).toBeInTheDocument();
  });

  it('renders "Good" label for good recommendation', () => {
    render(<VerdictBadge recommendation="good" />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders "Fair" label for fair recommendation', () => {
    render(<VerdictBadge recommendation="fair" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('renders "Skip" label for skip recommendation', () => {
    render(<VerdictBadge recommendation="skip" />);
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('uses emerald color classes for perfect recommendation', () => {
    const { container } = render(<VerdictBadge recommendation="perfect" />);
    expect(container.innerHTML).toMatch(/emerald/);
  });

  it('uses amber color classes for fair recommendation', () => {
    const { container } = render(<VerdictBadge recommendation="fair" />);
    expect(container.innerHTML).toMatch(/amber/);
  });

  it('uses red color classes for skip recommendation', () => {
    const { container } = render(<VerdictBadge recommendation="skip" />);
    expect(container.innerHTML).toMatch(/red/);
  });

  it('uses ocean or blue color classes for good recommendation', () => {
    const { container } = render(<VerdictBadge recommendation="good" />);
    expect(container.innerHTML).toMatch(/ocean|blue/);
  });

  it('renders with sm size by default', () => {
    const { container } = render(<VerdictBadge recommendation="perfect" />);
    // Should render without error and produce output
    expect(container.firstChild).not.toBeNull();
  });

  it('renders with md size when specified', () => {
    const { container } = render(<VerdictBadge recommendation="perfect" size="md" />);
    expect(container.firstChild).not.toBeNull();
    // md size should produce larger text class
    expect(container.innerHTML).toMatch(/text-sm|text-base|px-3|py-1/);
  });

  it('renders with sm size when explicitly specified', () => {
    const { container } = render(<VerdictBadge recommendation="perfect" size="sm" />);
    expect(container.firstChild).not.toBeNull();
    expect(container.innerHTML).toMatch(/text-xs|px-2/);
  });

  it('does not use any dark: classes', () => {
    const { container } = render(<VerdictBadge recommendation="perfect" />);
    expect(container.innerHTML).not.toContain('dark:');
  });
});

describe('VerdictBadgeSkeleton', () => {
  it('renders a skeleton placeholder', () => {
    const { container } = render(<VerdictBadgeSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders with animate-pulse or skeleton styling', () => {
    const { container } = render(<VerdictBadgeSkeleton />);
    expect(container.innerHTML).toMatch(/animate-pulse|skeleton|bg-gray|bg-sand/);
  });

  it('does not render any verdict text', () => {
    render(<VerdictBadgeSkeleton />);
    expect(screen.queryByText('Perfect')).toBeNull();
    expect(screen.queryByText('Good')).toBeNull();
    expect(screen.queryByText('Fair')).toBeNull();
    expect(screen.queryByText('Skip')).toBeNull();
  });
});
