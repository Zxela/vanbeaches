import type { CrowdState } from './model';

export function CrowdDisplay({ state }: { state: CrowdState | null }) {
  if (!state) return null;
  return (
    <details className="coast-crowd">
      <summary>
        <output aria-live="polite">
          Estimated activity:{' '}
          <strong>{state.category.charAt(0).toUpperCase() + state.category.slice(1)}</strong>
        </output>
        <span> · Low confidence</span>
      </summary>
      <p>
        Approximate activity for the selected time, based on typical patterns and environmental
        conditions. Figures in the scene are illustrative; they do not represent tracked visitors or
        a live headcount.
      </p>
      <p>
        These assumptions have not yet been calibrated against observed attendance. Events and local
        closures are not included.
      </p>
      {state.basis === 'limited-data' && (
        <p>Some environmental data is missing or stale. Typical patterns carry more weight.</p>
      )}
    </details>
  );
}
