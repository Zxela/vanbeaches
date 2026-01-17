# Task: TASK-031 Navigation and Routing

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-029 (Dashboard Page), TASK-030 (BeachDetail Page)
- Provides: Complete navigation system with header, breadcrumbs, and 404 page
- Size: Small (4 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Complete the React Router configuration with navigation header component, breadcrumbs on detail page, and 404 page for invalid routes. Update App.tsx to include all routes and the navigation component.

## Target Files

- [ ] `/home/zxela/workspace/client/src/App.tsx` (update)
- [ ] `/home/zxela/workspace/client/src/components/Navigation.tsx`
- [ ] `/home/zxela/workspace/client/src/pages/NotFound.tsx`
- [ ] `/home/zxela/workspace/client/src/components/__tests__/Navigation.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-029: Dashboard page
  - TASK-030: BeachDetail page
- [ ] Write failing tests for Navigation and routing:
  ```typescript
  import { render, screen } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'
  import { describe, it, expect } from 'vitest'
  import App from '../App'
  import { Navigation } from '../components/Navigation'

  describe('Navigation', () => {
    it('displays logo/title', () => {
      render(
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      )

      expect(screen.getByText(/Van Beaches/i)).toBeInTheDocument()
    })

    it('has link to home', () => {
      render(
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      )

      const homeLink = screen.getByRole('link', { name: /home|van beaches/i })
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('is visible on all pages', () => {
      render(
        <MemoryRouter initialEntries={['/beach/english-bay']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('navigation')).toBeInTheDocument()
    })
  })

  describe('Routing', () => {
    it('/ renders Dashboard', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByText(/Vancouver Beaches/i)).toBeInTheDocument()
    })

    it('/beach/:slug renders BeachDetail', () => {
      render(
        <MemoryRouter initialEntries={['/beach/english-bay']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByText(/English Bay/i)).toBeInTheDocument()
    })

    it('invalid routes show 404', () => {
      render(
        <MemoryRouter initialEntries={['/invalid-route']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByText(/not found|404/i)).toBeInTheDocument()
    })
  })

  describe('NotFound page', () => {
    it('displays 404 message', () => {
      render(
        <MemoryRouter initialEntries={['/some/invalid/path']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByText(/page not found|404/i)).toBeInTheDocument()
    })

    it('provides link to home', () => {
      render(
        <MemoryRouter initialEntries={['/some/invalid/path']}>
          <App />
        </MemoryRouter>
      )

      const homeLink = screen.getByRole('link', { name: /home|dashboard/i })
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement Navigation component:
  ```typescript
  import { Link } from 'react-router-dom'

  export function Navigation() {
    return (
      <nav
        data-testid="navigation"
        className="bg-blue-600 text-white shadow-lg"
      >
        <div className="container mx-auto px-4 py-3">
          <Link
            to="/"
            className="text-xl font-bold hover:text-blue-200 transition-colors"
          >
            Van Beaches
          </Link>
        </div>
      </nav>
    )
  }
  ```
- [ ] Implement NotFound page:
  ```typescript
  import { Link } from 'react-router-dom'

  export function NotFound() {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }
  ```
- [ ] Update App.tsx:
  ```typescript
  import { BrowserRouter, Routes, Route } from 'react-router-dom'
  import { Navigation } from './components/Navigation'
  import { Dashboard } from './pages/Dashboard'
  import { BeachDetail } from './pages/BeachDetail'
  import { NotFound } from './pages/NotFound'

  export default function App() {
    return (
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/beach/:slug" element={<BeachDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    )
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify `/` renders Dashboard
- [ ] Verify `/beach/:slug` renders BeachDetail
- [ ] Verify invalid routes show 404
- [ ] Verify navigation header on all pages
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] `/` renders Dashboard page
- [ ] `/beach/:slug` renders BeachDetail page
- [ ] Invalid routes show 404 page
- [ ] Navigation header visible on all pages
- [ ] Navigation links work correctly
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- Routes: "/" for Dashboard, "/beach/:slug" for BeachDetail
- Error handling: Invalid routes show 404
- Navigation: Consistent header across all pages

## Notes

- Impact scope: Completes the client-side routing setup
- Constraints: Navigation must be consistent across all pages
- 404 page should be user-friendly with clear path back to dashboard
- All routes should work with direct URL access (not just navigation)
