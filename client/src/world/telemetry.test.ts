import { describe, expect, it } from 'vitest';
import { WorldTelemetry } from './telemetry';

describe('local world diagnostics', () => {
  it('times first render once and restarts detail timing for each selection', () => {
    const telemetry = new WorldTelemetry(100);
    telemetry.beachDetailReady(150);
    expect(telemetry.snapshot().selectedBeachDetailMs).toBeNull();
    telemetry.firstRender(180);
    telemetry.firstRender(200);
    expect(telemetry.snapshot().firstRenderMs).toBe(80);
    telemetry.selectBeach(300);
    telemetry.beachDetailReady(450);
    telemetry.beachDetailReady(900);
    expect(telemetry.snapshot().selectedBeachDetailMs).toBe(150);
    telemetry.selectBeach(1000);
    expect(telemetry.snapshot().selectedBeachDetailMs).toBeNull();
  });

  it('returns isolated category counts without exception text or identifying data', () => {
    const telemetry = new WorldTelemetry(0);
    telemetry.error('terrain');
    telemetry.error('webgl');
    const snapshot = telemetry.snapshot();
    snapshot.errors.terrain = 999;
    expect(telemetry.snapshot().errors).toEqual({
      terrain: 1,
      building: 0,
      regional: 0,
      webgl: 1,
      water: 0,
    });
  });
});
