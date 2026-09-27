export type WorldError = 'terrain' | 'building' | 'regional' | 'webgl' | 'water';

/** Session-only aggregate diagnostics. No identifiers, persistence or network collection. */
export class WorldTelemetry {
  private firstRenderMs: number | null = null;
  private selectedAt: number | null = null;
  private selectedBeachDetailMs: number | null = null;
  private errors: Record<WorldError, number> = {
    terrain: 0,
    building: 0,
    regional: 0,
    webgl: 0,
    water: 0,
  };

  constructor(private startedAt = performance.now()) {}

  firstRender(now = performance.now()) {
    if (this.firstRenderMs === null) this.firstRenderMs = Math.max(0, now - this.startedAt);
  }

  selectBeach(now = performance.now()) {
    this.selectedAt = now;
    this.selectedBeachDetailMs = null;
  }

  beachDetailReady(now = performance.now()) {
    if (this.selectedAt !== null && this.selectedBeachDetailMs === null)
      this.selectedBeachDetailMs = Math.max(0, now - this.selectedAt);
  }

  error(kind: WorldError) {
    this.errors[kind] = Math.min(Number.MAX_SAFE_INTEGER, this.errors[kind] + 1);
  }

  snapshot() {
    return {
      firstRenderMs: this.firstRenderMs,
      selectedBeachDetailMs: this.selectedBeachDetailMs,
      errors: { ...this.errors },
    };
  }
}
