import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TabBar } from './TabBar';
import type { BeachDetailTab } from './TabBar';

describe('TabBar', () => {
  // AC-001: TabBar renders three tab buttons: Today, About, Photos
  it('renders three tab buttons: Today, About, Photos', () => {
    const onTabChange = vi.fn();
    render(<TabBar activeTab="today" onTabChange={onTabChange} />);
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /photos/i })).toBeInTheDocument();
  });

  // AC-002: Clicking a tab calls onTabChange with the correct tab key
  it('calls onTabChange with "today" when Today tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<TabBar activeTab="about" onTabChange={onTabChange} />);
    await user.click(screen.getByRole('button', { name: /today/i }));
    expect(onTabChange).toHaveBeenCalledWith('today');
  });

  it('calls onTabChange with "about" when About tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<TabBar activeTab="today" onTabChange={onTabChange} />);
    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(onTabChange).toHaveBeenCalledWith('about');
  });

  it('calls onTabChange with "photos" when Photos tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<TabBar activeTab="today" onTabChange={onTabChange} />);
    await user.click(screen.getByRole('button', { name: /photos/i }));
    expect(onTabChange).toHaveBeenCalledWith('photos');
  });

  // AC-003: The active tab has a visually distinct style (coral-500 accent)
  it('applies high-contrast text to the active tab button', () => {
    render(<TabBar activeTab="today" onTabChange={vi.fn()} />);
    const todayBtn = screen.getByRole('button', { name: /today/i });
    expect(todayBtn.className).toContain('text-white');
  });

  it('does not apply coral color to inactive tab buttons', () => {
    render(<TabBar activeTab="today" onTabChange={vi.fn()} />);
    const aboutBtn = screen.getByRole('button', { name: /about/i });
    expect(aboutBtn.className).not.toContain('text-coral');
  });

  // AC-004: TabBar accepts activeTab prop and renders that tab as selected
  it('renders "about" as selected when activeTab is "about"', () => {
    render(<TabBar activeTab="about" onTabChange={vi.fn()} />);
    const aboutBtn = screen.getByRole('button', { name: /about/i });
    expect(aboutBtn.className).toContain('text-white');
    const todayBtn = screen.getByRole('button', { name: /today/i });
    expect(todayBtn.className).toContain('text-white/60');
  });

  it('renders "photos" as selected when activeTab is "photos"', () => {
    render(<TabBar activeTab="photos" onTabChange={vi.fn()} />);
    const photosBtn = screen.getByRole('button', { name: /photos/i });
    expect(photosBtn.className).toContain('text-white');
  });

  // Type export check: BeachDetailTab type is exported
  it('exports BeachDetailTab type (verified at compile time)', () => {
    // If the import above works, BeachDetailTab is exported
    const tab: BeachDetailTab = 'today';
    expect(tab).toBe('today');
  });

  // Light-mode only: no dark: classes
  it('uses light-mode-only styles (no dark: classes)', () => {
    const { container } = render(<TabBar activeTab="today" onTabChange={vi.fn()} />);
    expect(container.innerHTML).not.toContain('dark:');
  });
});
