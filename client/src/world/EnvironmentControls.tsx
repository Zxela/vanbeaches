import type { EnvironmentData, EnvironmentalState } from '@van-beaches/shared';

export const localTime = (time: string | number) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(time));

export function EnvironmentControls({
  depthMode,
  onDepthMode,
  state,
  data,
  now,
  offline,
  onTime,
}: {
  depthMode: boolean;
  onDepthMode: (value: boolean) => void;
  state: EnvironmentalState;
  data: EnvironmentData | null;
  now: number;
  offline: boolean;
  onTime: (timestamp: number | null) => void;
}) {
  const start = Math.floor(now / 3600000) * 3600000 - 6 * 3600000;
  const end = start + 54 * 3600000;
  const time = Date.parse(state.timestamp);
  const points =
    data?.tide.predictions.filter(
      (p) => Date.parse(p.time) >= start && Date.parse(p.time) <= end,
    ) ?? [];
  const heights = points.map((p) => p.heightCD);
  const min = Math.min(...heights, 0);
  const max = Math.max(...heights, 5);
  const x = (timestamp: number) => ((timestamp - start) / (end - start)) * 600;
  const y = (height: number) => 42 - ((height - min) / (max - min)) * 36;
  const path = points.map((p) => `${x(Date.parse(p.time))},${y(p.heightCD)}`).join(' ');
  const weather = state.weather;
  return (
    <div className="coast-timeline">
      <div className="coast-time-heading">
        <fieldset className="coast-modes" aria-label="Visualization">
          <button type="button" aria-pressed={!depthMode} onClick={() => onDepthMode(false)}>
            Natural
          </button>
          <button type="button" aria-pressed={depthMode} onClick={() => onDepthMode(true)}>
            Depth
          </button>
        </fieldset>
        <button type="button" aria-pressed={state.mode === 'LIVE'} onClick={() => onTime(null)}>
          LIVE
        </button>
        <button type="button" aria-pressed={state.mode === 'TIMELINE'} onClick={() => onTime(time)}>
          TIMELINE
        </button>
        <output aria-label="Selected coastal time">{localTime(time)}</output>
      </div>
      <div className="coast-conditions">
        <strong>
          {state.tide.heightCD.toFixed(2)} m CD · {state.tide.source}
          {state.tide.stale ? ' · stale / fallback' : ''}
        </strong>
        <span>
          {weather.source === 'neutral'
            ? 'Neutral weather fallback'
            : `${weather.temperature.toFixed(0)}°C · ${weather.condition === 'sunny' && state.sun.elevation < 0 ? 'clear' : weather.condition.replace('-', ' ')} · ${weather.windSpeed.toFixed(0)} km/h wind`}
        </span>
      </div>
      <div className="coast-curve">
        <svg
          viewBox="0 0 600 48"
          preserveAspectRatio="none"
          role="img"
          aria-label="Official predicted tide curve, six hours ago through the next 48 hours"
        >
          <title>CHS Vancouver 07735 predicted water level</title>
          {points.length > 1 && (
            <polyline points={path} fill="none" stroke="#a9dcd3" strokeWidth="1.8" />
          )}
          <line x1={x(now)} x2={x(now)} y1="3" y2="45" stroke="#ffffff45" strokeDasharray="2 3" />
          <line x1={x(time)} x2={x(time)} y1="1" y2="47" stroke="#f0d79b" />
        </svg>
        <input
          aria-label="Coastal timeline"
          aria-valuetext={localTime(time)}
          type="range"
          min={start}
          max={end}
          step={300000}
          value={time}
          onChange={(event) => onTime(Number(event.target.value))}
        />
      </div>
      <div className="coast-time-labels">
        <span>−6 h</span>
        <span>Now → next 48 h</span>
      </div>
      <div className="coast-tide-events">
        {[state.tide.nextHigh, state.tide.nextLow].map(
          (event) =>
            event &&
            Date.parse(event.time) <= end && (
              <button type="button" key={event.type} onClick={() => onTime(Date.parse(event.time))}>
                Next {event.type} · {event.height.toFixed(1)} m · {localTime(event.time)}
              </button>
            ),
        )}
      </div>
      <details className="coast-data-status">
        <summary>
          {offline ? 'Offline · using available data' : 'Sources & freshness'}
          {weather.stale ? ' · weather fallback / stale' : ''}
        </summary>
        <p>
          CHS Vancouver 07735 · {state.tide.source}.{' '}
          {state.tide.sampleTime
            ? `Value at ${localTime(state.tide.sampleTime)}.`
            : 'No tide data; neutral reference level.'}
        </p>
        <p>
          Predictions retrieved:{' '}
          {data?.tide.predictionsFetchedAt
            ? localTime(data.tide.predictionsFetchedAt)
            : 'unavailable'}
          . Observations retrieved:{' '}
          {data?.tide.observationsFetchedAt
            ? localTime(data.tide.observationsFetchedAt)
            : 'unavailable'}
          .
        </p>
        <p>
          Open-Meteo · {weather.source} ·{' '}
          {weather.fetchedAt ? `retrieved ${localTime(weather.fetchedAt)}` : 'unavailable'}. Weather
          is modelled at beach coordinates, not a beach station measurement.
        </p>
        <p>
          Cloud {weather.cloudCover.toFixed(0)}% · precipitation {weather.precipitation.toFixed(1)}{' '}
          mm · wind from {weather.windDirection.toFixed(0)}° · visibility{' '}
          {weather.visibility === null
            ? 'unavailable; conservative haze'
            : `${(weather.visibility / 1000).toFixed(1)} km`}
          .
        </p>
        <p>
          Water and weather effects are a visualization, not a marine forecast. Times shown in
          Vancouver time.
        </p>
      </details>
    </div>
  );
}
