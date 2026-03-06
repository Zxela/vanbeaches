import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { Layout } from '../Layout';

// Minimal router wrapper because Layout uses Link and useLocation
import { MemoryRouter } from 'react-router-dom';

function renderLayout() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Layout>
          <div>content</div>
        </Layout>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Layout dark mode toggle', () => {
  it('AC-012-UI: header contains a dark-mode-toggle button that calls toggleTheme on click', async () => {
    const user = userEvent.setup();
    renderLayout();

    const toggle = screen.getByTestId('dark-mode-toggle');
    expect(toggle).toBeInTheDocument();

    await user.click(toggle);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
