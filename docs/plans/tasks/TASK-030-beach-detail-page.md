# Task: TASK-030 BeachDetail Page

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-012 (TideChart), TASK-017 (WeatherWidget), TASK-022 (WaterQuality), TASK-025 (WebcamEmbed)
- Provides: Detail page integrating all beach data widgets
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the BeachDetail page that integrates WeatherWidget, TideChart, WaterQuality, and WebcamEmbed components. The page handles the beachId route parameter, displays beach name and navigation back to dashboard, and handles invalid beach ID with a 404 page.

## Target Files

- [ ] `/home/zxela/workspace/client/src/pages/BeachDetail.tsx`
- [ ] `/home/zxela/workspace/client/src/pages/__tests__/BeachDetail.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-012: TideChart component
  - TASK-017: WeatherWidget component
  - TASK-022: WaterQuality component
  - TASK-025: WebcamEmbed component
- [ ] Write failing tests for BeachDetail page:
  ```typescript
  import { render, screen } from '@testing-library/react'
  import { MemoryRouter, Route, Routes } from 'react-router-dom'
  import { vi, describe, it, expect, beforeEach } from 'vitest'
  import { BeachDetail } from '../BeachDetail'
  import { useTides } from '../../hooks/useTides'
  import { useWeather } from '../../hooks/useWeather'
  import { useWaterQuality } from '../../hooks/useWaterQuality'

  vi.mock('../../hooks/useTides')
  vi.mock('../../hooks/useWeather')
  vi.mock('../../hooks/useWaterQuality')
  vi.mock('@van-beaches/shared/data', () => ({
    getBeachById: (id: string) =>
      id === 'english-bay'
        ? { id: 'english-bay', name: 'English Bay', hasWebcam: true, webcamUrl: 'https://...' }
        : null
  }))

  const renderWithRouter = (beachId: string) => {
    return render(
      <MemoryRouter initialEntries={[`/beach/${beachId}`]}>
        <Routes>
          <Route path="/beach/:slug" element={<BeachDetail />} />
        </Routes>
      </MemoryRouter>
    )
  }

  describe('BeachDetail', () => {
    beforeEach(() => {
      vi.resetAllMocks()

      vi.mocked(useTides).mockReturnValue({
        tides: { predictions: [] },
        loading: false,
        error: null,
        refetch: vi.fn()
      })
      vi.mocked(useWeather).mockReturnValue({
        weather: { current: { temperature: 15 }, hourly: [] },
        loading: false,
        error: null,
        refetch: vi.fn()
      })
      vi.mocked(useWaterQuality).mockReturnValue({
        waterQuality: { level: 'good' },
        loading: false,
        error: null,
        refetch: vi.fn()
      })
    })

    describe('valid beach', () => {
      it('displays beach name', () => {
        renderWithRouter('english-bay')

        expect(screen.getByText('English Bay')).toBeInTheDocument()
      })

      it('renders WeatherWidget', () => {
        renderWithRouter('english-bay')

        expect(screen.getByTestId('weather-widget')).toBeInTheDocument()
      })

      it('renders TideChart', () => {
        renderWithRouter('english-bay')

        expect(screen.getByTestId('tide-chart')).toBeInTheDocument()
      })

      it('renders WaterQuality', () => {
        renderWithRouter('english-bay')

        expect(screen.getByTestId('water-quality')).toBeInTheDocument()
      })

      it('renders WebcamEmbed', () => {
        renderWithRouter('english-bay')

        expect(screen.getByTestId('webcam-embed')).toBeInTheDocument()
      })

      it('has navigation back to dashboard', () => {
        renderWithRouter('english-bay')

        const backLink = screen.getByRole('link', { name: /back|dashboard/i })
        expect(backLink).toHaveAttribute('href', '/')
      })
    })

    describe('invalid beach', () => {
      it('shows 404 for invalid beach slug', () => {
        renderWithRouter('invalid-beach')

        expect(screen.getByText(/not found/i)).toBeInTheDocument()
      })

      it('provides link back to dashboard', () => {
        renderWithRouter('invalid-beach')

        const homeLink = screen.getByRole('link', { name: /home|dashboard/i })
        expect(homeLink).toHaveAttribute('href', '/')
      })
    })

    describe('loading states', () => {
      it('shows loading state for all widgets', () => {
        vi.mocked(useTides).mockReturnValue({
          tides: null,
          loading: true,
          error: null,
          refetch: vi.fn()
        })
        vi.mocked(useWeather).mockReturnValue({
          weather: null,
          loading: true,
          error: null,
          refetch: vi.fn()
        })
        vi.mocked(useWaterQuality).mockReturnValue({
          waterQuality: null,
          loading: true,
          error: null,
          refetch: vi.fn()
        })

        renderWithRouter('english-bay')

        expect(screen.getAllByTestId(/-skeleton/).length).toBeGreaterThan(0)
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement BeachDetail page:
  ```typescript
  import { useParams, Link } from 'react-router-dom'
  import { getBeachById } from '@van-beaches/shared/data'
  import { useTides } from '../hooks/useTides'
  import { useWeather } from '../hooks/useWeather'
  import { useWaterQuality } from '../hooks/useWaterQuality'
  import { WeatherWidget } from '../components/WeatherWidget'
  import { TideChart } from '../components/TideChart'
  import { WaterQuality } from '../components/WaterQuality'
  import { WebcamEmbed } from '../components/WebcamEmbed'

  export function BeachDetail() {
    const { slug } = useParams<{ slug: string }>()
    const beach = slug ? getBeachById(slug) : null

    const { tides, loading: tidesLoading, error: tidesError } = useTides(slug || '')
    const { weather, loading: weatherLoading, error: weatherError } = useWeather(slug || '')
    const { waterQuality, loading: wqLoading, error: wqError } = useWaterQuality(slug || '')

    // 404 for invalid beach
    if (!beach) {
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Beach Not Found</h1>
          <p className="text-gray-600 mb-4">
            The beach you're looking for doesn't exist.
          </p>
          <Link
            to="/"
            className="text-blue-600 hover:underline"
          >
            Return to Dashboard
          </Link>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="mb-4">
          <Link
            to="/"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
        </nav>

        {/* Beach Title */}
        <h1 className="text-3xl font-bold mb-6">{beach.name}</h1>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weather Widget */}
          <div data-testid="weather-widget" className="bg-white rounded-lg shadow p-4">
            <WeatherWidget
              weather={weather}
              loading={weatherLoading}
              error={weatherError}
            />
          </div>

          {/* Tide Chart */}
          <div data-testid="tide-chart" className="bg-white rounded-lg shadow p-4">
            <TideChart
              tides={tides}
              loading={tidesLoading}
              error={tidesError}
            />
          </div>

          {/* Water Quality */}
          <div data-testid="water-quality" className="bg-white rounded-lg shadow p-4">
            <WaterQuality
              status={waterQuality}
              loading={wqLoading}
              error={wqError}
            />
          </div>

          {/* Webcam */}
          <div data-testid="webcam-embed" className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">Live Webcam</h3>
            <WebcamEmbed
              embedUrl={beach.webcamUrl}
              beachName={beach.name}
            />
          </div>
        </div>
      </div>
    )
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify all four widgets display for valid beach
- [ ] Verify 404 shown for invalid beach slug
- [ ] Verify navigation back to dashboard works
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] All four widgets display (Weather, Tide, WaterQuality, Webcam)
- [ ] 404 shown for invalid beach slug
- [ ] Navigation back to dashboard works
- [ ] Beach name displayed prominently
- [ ] Responsive layout for widgets
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "When user views beach detail, display 24-hour weather forecast"
- AC: "When user views beach, display next 3 high and low tides"
- AC: "Display water quality status"
- AC: "When webcam available, embed live feed"
- Component: BeachDetail Page (`/client/src/pages/BeachDetail.tsx`)
- Responsibility: Detailed view for single beach with all data

## Notes

- Impact scope: This is the main detail view showing all beach data
- Constraints: Must handle invalid beach IDs gracefully
- All widgets should be independent and handle their own loading/error states
- Route parameter is `:slug` which maps to beach ID
