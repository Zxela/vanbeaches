import { BEACHES } from '@van-beaches/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEnvironment } from '../hooks/useEnvironment';
import { EnvironmentControls } from '../world/EnvironmentControls';
import { CrowdDisplay } from '../world/crowd/CrowdDisplay';
import { estimateCrowd } from '../world/crowd/model';
import { normalizeEnvironment } from '../world/environment';
import { assetUrl, loadManifest } from '../world/manifest';
import { DEFAULT_MOVING_LAYERS } from '../world/moving/runtime';
import type { QualityTier } from '../world/quality';
import type { TerrainDebugMode } from '../world/regionalDebug';
import { CoastRuntime } from '../world/runtime';
import type { RuntimeStats, WorldManifest } from '../world/types';
import '../world/coast.css';

const beachName = (id: string) =>
  BEACHES.find((beach) => beach.id === id)?.name ??
  id
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

declare global {
  interface Window {
    __coastProfile?: () => ReturnType<CoastRuntime['snapshot']>;
    __coastDebug?: Pick<CoastRuntime, 'setTide' | 'setQuality' | 'setWaterDebug'>;
  }
}

export default function Coast() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('beach') ?? '';
  const [manifest, setManifest] = useState<WorldManifest | null>(null);
  const [failure, setFailure] = useState('');
  const [retry, setRetry] = useState(0);
  const [stats, setStats] = useState<RuntimeStats | null>(null);
  const [depthMode, setDepthMode] = useState(false);
  const [layers, setLayers] = useState({ ...DEFAULT_MOVING_LAYERS, people: true });
  const [waterDebug, setWaterDebug] = useState<'off' | 'occlusion' | 'marine'>('off');
  const [waterOpacity, setWaterOpacity] = useState(1);
  const [terrainDebug, setTerrainDebug] = useState<TerrainDebugMode>('off');
  const [terrainView, setTerrainView] = useState('spanish-banks');
  const [inspectedTerrain, setInspectedTerrain] = useState<string | null>(null);
  const [snowLine, setSnowLine] = useState(1400);
  const [snowAmount, setSnowAmount] = useState(0.35);
  const [now, setNow] = useState(Date.now);
  const [chosenTime, setChosenTime] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<CoastRuntime | null>(null);
  const markers = useRef(new Map<string, HTMLElement>());
  const profiling = params.has('profile');
  const beach = BEACHES.find((item) => item.id === selected);
  const destination = manifest?.beaches.find((item) => item.id === selected);

  const environmentBeach = beach?.id ?? 'spanish-banks';
  const { data, offline } = useEnvironment(environmentBeach);
  const location =
    beach?.location ??
    BEACHES.find((item) => item.id === 'spanish-banks')?.location ??
    BEACHES[0].location;
  const timestamp = chosenTime ?? now;
  const environment = useMemo(
    () =>
      normalizeEnvironment(
        data,
        timestamp,
        chosenTime === null ? 'LIVE' : 'TIMELINE',
        { latitude: location.latitude, longitude: location.longitude },
        manifest?.water.initial_tide_cd_m ?? 3,
        now,
      ),
    [data, timestamp, chosenTime, location.latitude, location.longitude, manifest, now],
  );
  const crowd = useMemo(
    () => (beach && destination ? estimateCrowd(beach.id, environment, beach.location) : null),
    [beach, destination, environment],
  );
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry intentionally recreates the renderer and fetch.
  useEffect(() => {
    const abort = new AbortController();
    setFailure('');
    setManifest(null);
    setStats(null);
    void loadManifest(abort.signal)
      .then((world) => {
        if (abort.signal.aborted || !host.current) return;
        try {
          const instance = new CoastRuntime(host.current, world, setStats, setFailure);
          runtime.current = instance;
          instance.setMarkers(markers.current);
          if (profiling) {
            window.__coastProfile = () => instance.snapshot();
            window.__coastDebug = {
              setTide: instance.setTide.bind(instance),
              setQuality: instance.setQuality.bind(instance),
              setWaterDebug: instance.setWaterDebug.bind(instance),
            };
          }
          setManifest(world);
        } catch {
          setFailure(
            'This device could not start the 3D coast. All beach pages are still available.',
          );
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setFailure(
            'The coastal model could not be loaded. Please try again or browse the beaches.',
          );
      });
    return () => {
      abort.abort();
      runtime.current?.dispose();
      runtime.current = null;
      window.__coastProfile = undefined;
      window.__coastDebug = undefined;
    };
  }, [retry, profiling]);

  useEffect(() => {
    if (!manifest) return;
    const target = manifest.beaches.find((item) => item.id === selected);
    if (target) runtime.current?.flyToBeach(target);
    else runtime.current?.overview();
  }, [selected, manifest]);

  useEffect(() => {
    runtime.current?.setEnvironment(environment, depthMode);
  }, [environment, depthMode]);
  useEffect(() => {
    if (manifest) runtime.current?.setLayers(layers);
  }, [layers, manifest]);
  useEffect(() => {
    if (manifest) runtime.current?.setWaterDebug(waterDebug, waterOpacity);
  }, [waterDebug, waterOpacity, manifest]);

  useEffect(() => {
    if (manifest?.regional) void runtime.current?.setTerrainDebug(terrainDebug, terrainView);
  }, [terrainDebug, terrainView, manifest]);

  useEffect(() => {
    if (manifest?.regional) {
      setSnowLine(manifest.regional.snow.lineMetres);
      setSnowAmount(manifest.regional.snow.amount);
    }
  }, [manifest]);

  useEffect(() => {
    runtime.current?.setMountainSnow(snowLine, snowAmount);
  }, [snowLine, snowAmount]);

  const choose = (id: string) => {
    setInspectedTerrain(null);
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id) next.set('beach', id);
      else next.delete('beach');
      return next;
    });
  };

  return (
    <section className="coast" aria-label="Vancouver coastal world">
      <div className="coast-viewport" ref={host} />
      <div className="coast-heading">
        <p>VANCOUVER / THE WATER'S EDGE</p>
        <h1>
          {inspectedTerrain
            ? `${BEACHES.find((b) => b.id === inspectedTerrain)?.name ?? 'Wreck Beach'} · Terrain viewpoint`
            : (beach?.name ??
              (destination ? beachName(destination.id) : 'A different perspective.'))}
        </h1>
        <span>Explore the coast, from Point Grey to Stanley Park.</span>
      </div>
      {!failure &&
        manifest?.beaches.map((item) => (
          <button
            key={item.id}
            type="button"
            className="coast-marker"
            ref={(element) => {
              if (element) markers.current.set(item.id, element);
              else markers.current.delete(item.id);
            }}
            onClick={() => choose(item.id)}
            aria-label={`Fly to ${beachName(item.id)}`}
          >
            {beachName(item.id)}
          </button>
        ))}
      {failure ? (
        <div className="coast-fallback" role="alert">
          <h2>The coast is still here.</h2>
          <p>{failure}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Reload 3D coast
          </button>
          <Link to="/discover">Browse beaches</Link>
        </div>
      ) : (
        <>
          <output className="coast-status" aria-live="polite">
            {!manifest
              ? 'Preparing the coast…'
              : !stats?.loadedTiles
                ? 'Loading coastal terrain…'
                : stats.failedTiles
                  ? 'Some terrain is unavailable.'
                  : stats.pendingTiles
                    ? 'Refining the coastline…'
                    : ''}
            {!!stats?.failedTiles && (
              <button type="button" onClick={() => runtime.current?.retry()}>
                Retry terrain
              </button>
            )}
          </output>
          <div className="coast-controls" aria-label="Coast controls">
            <div className="coast-navigation">
              <button
                type="button"
                onClick={() => {
                  choose('');
                  runtime.current?.overview();
                }}
              >
                Overview
              </button>
              <label className="coast-select">
                <span className="sr-only">Fly to beach</span>
                <select
                  aria-label="Fly to beach"
                  value={selected}
                  onChange={(event) => choose(event.target.value)}
                  disabled={!manifest}
                >
                  <option value="">Explore a beach</option>
                  {BEACHES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {manifest && !manifest.beaches.some((b) => b.id === item.id)
                        ? ' · outside coastal model'
                        : ''}
                    </option>
                  ))}
                  {manifest?.beaches
                    .filter((item) => !BEACHES.some((beach) => beach.id === item.id))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {beachName(item.id)}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  destination
                    ? runtime.current?.flyToBeach(destination)
                    : runtime.current?.overview()
                }
              >
                Reset camera
              </button>
              {destination && (
                <button
                  type="button"
                  onClick={() => runtime.current?.flyToBeach(destination, true)}
                >
                  Beach level
                </button>
              )}
              {beach && <Link to={`/beach/${beach.id}`}>Beach page ↗</Link>}
            </div>
            {selected && !destination && manifest && (
              <p className="coast-outside">
                {beach
                  ? `${beach.name} is outside this coastal model.`
                  : 'This beach is not in the coastal model.'}
              </p>
            )}
            {destination && !beach && (
              <p className="coast-outside">
                Regional viewpoint · Nearby conditions from Spanish Banks
              </p>
            )}
            <details className="coast-condition-details" open={profiling}>
              <summary>
                {environment.weather.temperature.toFixed(0)}°C · Tide{' '}
                {environment.tide.heightCD.toFixed(1)} m · Conditions & timeline
              </summary>
              <EnvironmentControls
                depthMode={depthMode}
                onDepthMode={setDepthMode}
                state={environment}
                data={data}
                now={now}
                offline={offline}
                onTime={setChosenTime}
              />
            </details>
            <CrowdDisplay state={crowd} />
            <details className="coast-layer-controls">
              <summary>Scene options · SIMULATED movement</summary>
              <label>
                Quality{' '}
                <select
                  aria-label="Scene quality"
                  value={stats?.quality ?? 'HIGH'}
                  onChange={(event) =>
                    runtime.current?.setQuality(event.target.value as QualityTier)
                  }
                >
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((tier) => (
                    <option key={tier}>{tier}</option>
                  ))}
                </select>
              </label>
              <p>Harbour and air traffic · SIMULATED</p>
              <div className="coast-layer-grid">
                {Object.entries(layers).map(([key, enabled]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) =>
                        setLayers((previous) => ({ ...previous, [key]: event.target.checked }))
                      }
                    />
                    {key === 'people' ? 'People' : key[0].toUpperCase() + key.slice(1)}
                  </label>
                ))}
              </div>
              {stats?.quality === 'LOW' && <p>Movement is limited at LOW quality.</p>}
            </details>
            {depthMode && (
              <div className="coast-depth-key" aria-label="Water depth bands">
                {['0–2 m', '2–5 m', '5–10 m', '10–20 m', '20 m+'].map((label, index) => (
                  <span
                    key={label}
                    style={{
                      borderColor: ['#8ce8d9', '#14b8cc', '#05667a', '#06317a', '#020926'][index],
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <div className="coast-footer">
        <span>Drag to orbit · Pinch / scroll to zoom · Two fingers / right-drag to pan</span>
        {manifest && (
          <a href={assetUrl(manifest.noticesUrl)} target="_blank" rel="noreferrer">
            City / Metro Vancouver · NRCan · CHS NONNA · Not for navigation
          </a>
        )}
      </div>
      {profiling && stats && (
        <details className="coast-profile">
          <summary>Performance · {stats.fps} fps</summary>
          <label>
            Water debug{' '}
            <select
              aria-label="Water debug"
              value={waterDebug}
              onChange={(event) => setWaterDebug(event.target.value as typeof waterDebug)}
            >
              {['off', 'occlusion', 'marine'].map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </label>
          <label>
            Diagnostic water opacity{' '}
            <input
              aria-label="Diagnostic water opacity"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={waterOpacity}
              onChange={(event) => setWaterOpacity(Number(event.target.value))}
            />
          </label>
          <label>
            Urban debug{' '}
            <select
              aria-label="Urban debug"
              onChange={(event) =>
                runtime.current?.setUrbanDebug(
                  event.target.value as 'off' | 'height-source' | 'lod',
                )
              }
            >
              {['off', 'height-source', 'lod'].map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </label>
          <div className="coast-layer-grid">
            {(['buildings', 'roads', 'bridges', 'landcover', 'waterfront'] as const).map(
              (layer) => (
                <label key={layer}>
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={(event) =>
                      runtime.current?.setUrbanLayer(layer, event.target.checked)
                    }
                  />
                  {layer}
                </label>
              ),
            )}
          </div>
          {manifest?.regional && (
            <>
              <label>
                Terrain debug{' '}
                <select
                  aria-label="Terrain debug"
                  value={terrainDebug}
                  onChange={(e) => setTerrainDebug(e.target.value as TerrainDebugMode)}
                >
                  {[
                    'off',
                    'source',
                    'lod',
                    'distance',
                    'bounds',
                    'horizon',
                    'rays',
                    'visibility',
                  ].map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </label>
              <label>
                Terrain viewpoint{' '}
                <select
                  aria-label="Terrain viewpoint"
                  value={terrainView}
                  onChange={(e) => setTerrainView(e.target.value)}
                >
                  {[...new Set([...manifest.beaches.map((b) => b.id), 'wreck-beach'])].map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  const mode = terrainDebug === 'off' ? 'horizon' : terrainDebug;
                  setTerrainDebug(mode);
                  setInspectedTerrain(terrainView);
                  void runtime.current?.setTerrainDebug(mode, terrainView, true);
                }}
              >
                Inspect terrain viewpoint
              </button>
              <label>
                Visual snow line · {snowLine} m{' '}
                <input
                  aria-label="Visual snow line"
                  type="range"
                  min="0"
                  max="3000"
                  step="50"
                  value={snowLine}
                  onChange={(e) => setSnowLine(Number(e.target.value))}
                />
              </label>
              <label>
                Visual snow amount{' '}
                <input
                  aria-label="Visual snow amount"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={snowAmount}
                  onChange={(e) => setSnowAmount(Number(e.target.value))}
                />
              </label>
              <p>
                Snow is a visual setting. Green rays are visible terrain; red markers are occluded.
                Source colours show tiles containing fallback data.
              </p>
            </>
          )}
          <pre>{JSON.stringify(stats, null, 2)}</pre>
          <pre>{JSON.stringify(environment, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
