# Task: TASK-025 WebcamEmbed Component

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-024 (Webcam Service)
- Provides: Lazy-loaded webcam iframe embed with placeholder fallback
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the WebcamEmbed React component that implements lazy loading (Intersection Observer or loading="lazy"), displays a loading skeleton while loading, shows a placeholder with "Webcam unavailable" when URL is null, and sandboxes the iframe for security.

## Target Files

- [ ] `/home/zxela/workspace/client/src/components/WebcamEmbed.tsx`
- [ ] `/home/zxela/workspace/client/src/components/__tests__/WebcamEmbed.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-024: WebcamService available at `/server/src/services/webcamService.ts`
- [ ] Write failing tests for WebcamEmbed component:
  ```typescript
  import { render, screen, waitFor } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  import { WebcamEmbed } from '../WebcamEmbed'

  describe('WebcamEmbed', () => {
    describe('with valid URL', () => {
      it('renders iframe with embed URL', () => {
        render(
          <WebcamEmbed
            embedUrl="https://example.com/webcam"
            beachName="English Bay"
          />
        )

        const iframe = screen.getByTestId('webcam-iframe')
        expect(iframe).toHaveAttribute('src', 'https://example.com/webcam')
      })

      it('has sandbox attribute for security', () => {
        render(
          <WebcamEmbed
            embedUrl="https://example.com/webcam"
            beachName="English Bay"
          />
        )

        const iframe = screen.getByTestId('webcam-iframe')
        expect(iframe).toHaveAttribute('sandbox')
      })

      it('implements lazy loading', () => {
        render(
          <WebcamEmbed
            embedUrl="https://example.com/webcam"
            beachName="English Bay"
          />
        )

        const iframe = screen.getByTestId('webcam-iframe')
        expect(iframe).toHaveAttribute('loading', 'lazy')
      })
    })

    describe('placeholder states', () => {
      it('shows placeholder when URL is null', () => {
        render(
          <WebcamEmbed
            embedUrl={null}
            beachName="Locarno Beach"
          />
        )

        expect(screen.getByText(/Webcam unavailable/i)).toBeInTheDocument()
        expect(screen.queryByTestId('webcam-iframe')).not.toBeInTheDocument()
      })

      it('shows loading skeleton while loading', () => {
        render(
          <WebcamEmbed
            embedUrl="https://example.com/webcam"
            beachName="English Bay"
            loading={true}
          />
        )

        expect(screen.getByTestId('webcam-skeleton')).toBeInTheDocument()
      })
    })

    describe('accessibility', () => {
      it('has proper title for iframe', () => {
        render(
          <WebcamEmbed
            embedUrl="https://example.com/webcam"
            beachName="English Bay"
          />
        )

        const iframe = screen.getByTestId('webcam-iframe')
        expect(iframe).toHaveAttribute('title', 'English Bay live webcam')
      })

      it('provides alt text for placeholder image', () => {
        render(
          <WebcamEmbed
            embedUrl={null}
            beachName="Locarno Beach"
          />
        )

        const placeholder = screen.getByRole('img', { name: /webcam/i })
        expect(placeholder).toBeInTheDocument()
      })
    })

    describe('error handling', () => {
      it('shows error state when iframe fails to load', async () => {
        render(
          <WebcamEmbed
            embedUrl="https://example.com/webcam"
            beachName="English Bay"
          />
        )

        const iframe = screen.getByTestId('webcam-iframe')
        fireEvent.error(iframe)

        await waitFor(() => {
          expect(screen.getByText(/Webcam unavailable/i)).toBeInTheDocument()
        })
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement WebcamEmbed component:
  ```typescript
  import { useState } from 'react'

  interface WebcamEmbedProps {
    embedUrl: string | null
    beachName: string
    loading?: boolean
  }

  export function WebcamEmbed({ embedUrl, beachName, loading = false }: WebcamEmbedProps) {
    const [hasError, setHasError] = useState(false)

    if (loading) {
      return (
        <div
          data-testid="webcam-skeleton"
          className="animate-pulse bg-gray-200 aspect-video rounded-lg"
        />
      )
    }

    if (!embedUrl || hasError) {
      return (
        <div
          className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center"
          role="img"
          aria-label={`${beachName} webcam unavailable`}
        >
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📷</div>
            <p>Webcam unavailable</p>
            <p className="text-sm">{beachName}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="webcam-embed aspect-video">
        <iframe
          data-testid="webcam-iframe"
          src={embedUrl}
          title={`${beachName} live webcam`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full rounded-lg"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }
  ```
- [ ] Implement lazy loading (native loading="lazy" or Intersection Observer)
- [ ] Implement error handling for failed loads
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify webcam loads lazily (not on initial page load)
- [ ] Verify skeleton visible during loading
- [ ] Verify placeholder shown for beaches without webcam
- [ ] Verify iframe has sandbox attribute
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Webcam loads lazily (loading="lazy" attribute)
- [ ] Skeleton visible during loading
- [ ] Placeholder shown for beaches without webcam ("Webcam unavailable")
- [ ] iframe has sandbox attribute for security
- [ ] Error handling for failed webcam loads
- [ ] Proper accessibility (title, alt text)
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "When webcam available, embed live feed"
- AC: "If webcam fails to load, display placeholder"
- AC: "Webcam embeds lazy-loaded"
- AC: "While loading, display skeleton"
- Security: "Use sandbox attribute, only allow known webcam domains"

## Notes

- Impact scope: BeachDetail Page (TASK-028) will use this component
- Constraints: iframe must be sandboxed
- Only 3 beaches have webcams (English Bay, Jericho, Kitsilano)
- Lazy loading improves initial page performance
