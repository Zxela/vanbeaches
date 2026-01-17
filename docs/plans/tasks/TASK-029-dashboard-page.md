# Task: TASK-029 Dashboard Page

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-026 (BeachCard), TASK-028 (useBeaches Hook)
- Provides: Main dashboard page displaying all 9 beaches in responsive grid
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the Dashboard page component that displays a grid of 9 BeachCard components with responsive layout (1/2/3 columns), loading skeletons during fetch, and error state with retry option.

## Target Files

- [ ] `/home/zxela/workspace/client/src/pages/Dashboard.tsx`
- [ ] `/home/zxela/workspace/client/src/pages/__tests__/Dashboard.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-026: BeachCard available at `/client/src/components/BeachCard.tsx`
  - TASK-028: useBeaches hook available at `/client/src/hooks/useBeaches.ts`
- [ ] Write failing tests for Dashboard page:
  ```typescript
  import { render, screen, fireEvent, waitFor } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'
  import { vi, describe, it, expect, beforeEach } from 'vitest'
  import { Dashboard } from '../Dashboard'
  import { useBeaches } from '../../hooks/useBeaches'

  vi.mock('../../hooks/useBeaches')

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>)
  }

  describe('Dashboard', () => {
    const mockBeaches = Array(9).fill(null).map((_, i) => ({
      id: `beach-${i}`,
      name: `Beach ${i}`,
      currentWeather: { temperature: 15, condition: 'sunny' },
      nextTide: { type: 'high', time: '2026-01-17T14:00:00Z', height: 3.0 },
      waterQuality: 'good',
      lastUpdated: '2026-01-17T12:00:00Z'
    }))

    describe('beach cards', () => {
      it('displays 9 beach cards', () => {
        vi.mocked(useBeaches).mockReturnValue({
          beaches: mockBeaches,
          loading: false,
          error: null,
          refetch: vi.fn()
        })

        renderWithRouter(<Dashboard />)

        const cards = screen.getAllByTestId('beach-card')
        expect(cards).toHaveLength(9)
      })

      it('displays all beach names', () => {
        vi.mocked(useBeaches).mockReturnValue({
          beaches: mockBeaches,
          loading: false,
          error: null,
          refetch: vi.fn()
        })

        renderWithRouter(<Dashboard />)

        mockBeaches.forEach(beach => {
          expect(screen.getByText(beach.name)).toBeInTheDocument()
        })
      })
    })

    describe('responsive layout', () => {
      it('uses grid layout', () => {
        vi.mocked(useBeaches).mockReturnValue({
          beaches: mockBeaches,
          loading: false,
          error: null,
          refetch: vi.fn()
        })

        renderWithRouter(<Dashboard />)

        const grid = screen.getByTestId('beach-grid')
        expect(grid).toHaveClass('grid')
      })

      it('has responsive column classes', () => {
        vi.mocked(useBeaches).mockReturnValue({
          beaches: mockBeaches,
          loading: false,
          error: null,
          refetch: vi.fn()
        })

        renderWithRouter(<Dashboard />)

        const grid = screen.getByTestId('beach-grid')
        // Check for responsive grid classes
        expect(grid.className).toMatch(/grid-cols/)
      })
    })

    describe('loading state', () => {
      it('shows skeleton cards when loading', () => {
        vi.mocked(useBeaches).mockReturnValue({
          beaches: [],
          loading: true,
          error: null,
          refetch: vi.fn()
        })

        renderWithRouter(<Dashboard />)

        const skeletons = screen.getAllByTestId('beach-card-skeleton')
        expect(skeletons.length).toBeGreaterThan(0)
      })
    })

    describe('error state', () => {
      it('shows error message on failure', () => {
        vi.mocked(useBeaches).mockReturnValue({
          beaches: [],
          loading: false,
          error: 'Failed to load beaches',
          refetch: vi.fn()
        })

        renderWithRouter(<Dashboard />)

        expect(screen.getByText(/Failed to load/i)).toBeInTheDocument()
      })

      it('provides retry button', () => {
        const refetch = vi.fn()
        vi.mocked(useBeaches).mockReturnValue({
          beaches: [],
          loading: false,
          error: 'Failed to load beaches',
          refetch
        })

        renderWithRouter(<Dashboard />)

        const retryButton = screen.getByRole('button', { name: /retry/i })
        expect(retryButton).toBeInTheDocument()

        fireEvent.click(retryButton)
        expect(refetch).toHaveBeenCalled()
      })
    })

    describe('page header', () => {
      it('displays page title', () => {
        vi.mocked(useBeaches).mockReturnValue({
          beaches: mockBeaches,
          loading: false,
          error: null,
          refetch: vi.fn()
        })

        renderWithRouter(<Dashboard />)

        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement Dashboard page:
  ```typescript
  import { useBeaches } from '../hooks/useBeaches'
  import { BeachCard } from '../components/BeachCard'

  export function Dashboard() {
    const { beaches, loading, error, refetch } = useBeaches()

    if (error) {
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Vancouver Beaches</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Vancouver Beaches</h1>

        <div
          data-testid="beach-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {loading
            ? Array(9).fill(null).map((_, i) => (
                <BeachCard key={i} beach={null} loading={true} />
              ))
            : beaches.map(beach => (
                <div key={beach.id} data-testid="beach-card">
                  <BeachCard beach={beach} />
                </div>
              ))
          }
        </div>
      </div>
    )
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify 9 beach cards displayed in grid
- [ ] Verify responsive layout (1/2/3 columns)
- [ ] Verify loading skeletons shown during fetch
- [ ] Verify error state allows retry
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] 9 beach cards displayed in grid
- [ ] Responsive layout works at all breakpoints (1/2/3 columns)
- [ ] Loading skeletons shown during fetch
- [ ] Error state allows retry
- [ ] Page has proper heading/title
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Display all 9 Vancouver beaches"
- AC: "Support viewport widths 320px to 2560px" (responsive layout)
- Component: Dashboard Page (`/client/src/pages/Dashboard.tsx`)
- Responsibility: Main view showing all 9 beaches overview

## Notes

- Impact scope: This is the main entry point for the application
- Constraints: Must display exactly 9 beaches
- Responsive breakpoints: mobile (1 col), tablet (2 col), desktop (3 col)
- Error state should be user-friendly with clear retry action
