import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it } from 'vitest';
import { Layout } from './Layout';

beforeEach(() => localStorage.clear());
function Location() {
  return <output>{useLocation().pathname}</output>;
}
function renderLayout(path = '/discover') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Layout>
        <Location />
      </Layout>
    </MemoryRouter>,
  );
}
it('provides browse access and page content', () => {
  renderLayout();
  expect(screen.getByRole('link', { name: 'Browse beaches' })).toHaveAttribute('href', '/discover');
  expect(screen.getByRole('main')).toHaveTextContent('/discover');
});
it('groups beach selection, favorite, and share actions in the header', () => {
  renderLayout('/beach/kitsilano-beach');
  expect(screen.getByRole('combobox', { name: 'Select beach' })).toHaveValue('kitsilano-beach');
  expect(
    screen.getByRole('button', { name: /add kitsilano beach to favorites/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'english-bay' } });
  expect(screen.getByRole('status')).toHaveTextContent('/beach/english-bay');
});
it('typing h does not leave a beach page', () => {
  renderLayout('/beach/english-bay');
  fireEvent.keyDown(document, { key: 'h' });
  expect(screen.getByRole('status')).toHaveTextContent('/beach/english-bay');
});
