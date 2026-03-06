import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  // AC-001: renders the provided message string and a 'Try again' button when onRetry is provided
  it('renders the provided message string', () => {
    render(<ErrorState message="Something went wrong" onRetry={() => {}} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders a Try again button when onRetry is provided', () => {
    render(<ErrorState message="Error occurred" onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when Try again button is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error occurred" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  // AC-002: does not render a retry button when onRetry is not provided
  it('does not render a retry button when onRetry is not provided', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('still renders the message when onRetry is not provided', () => {
    render(<ErrorState message="No retry message" />);
    expect(screen.getByText('No retry message')).toBeInTheDocument();
  });
});
