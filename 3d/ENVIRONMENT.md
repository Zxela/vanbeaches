# Phase 3: live coastal environment

Open `/coast?beach=spanish-banks`. LIVE follows current time; TIMELINE explores six hours
back through approximately 48 hours ahead, in five-minute steps. The curve and high/low
buttons use official CHS predictions. All displayed times use `America/Vancouver`.
Returning to LIVE restores the clock and preference for recent observed water levels.

## Integration audit and architecture

The existing application already had Open-Meteo weather per shared beach coordinate,
CHS IWLS high/low tides, Cloudflare Pages API routes, scheduled Worker fetching,
shared weather/tide types, and a shared `BEACH_CACHE` KV namespace. There are no
independent beach weather stations. The existing station ID
`5cebf1de3d0f4a073c4bb943` resolves to **Vancouver 07735**, not Point Atkinson.

The Pages weather/tide routes now call the same Worker service modules as cron jobs.
`GET /api/environment/:beachId` composes those services; it does not introduce a second
weather provider or another tide pipeline. It returns a timestamped normalized data
window. Browser code never calls government or weather services directly.

```text
CHS IWLS + Open-Meteo
        ↓ existing Worker services / shared KV
Pages /api/environment/:beachId
        ↓ normalized, timestamped windows
useEnvironment → normalizeEnvironment(timestamp, mode)
        ↓ one EnvironmentalState
CoastRuntime → ocean / atmosphere / terrain shaders
```

Schemas and units live in `shared/src/types/environment.ts`. Runtime state includes source,
sample/retrieval timestamps, stale flags, high/low events, sun elevation/azimuth, and weather.
Weather is model output, including the provider's “current” values. Past weather is labelled
`past-model`; it is not a claim about a historical station measurement.

## Tide and datum

IWLS `wlo` supplies observations; only finite readings with QC flag `1` are eligible.
LIVE uses the latest observation at or before the selected time, at most 20 minutes old.
Otherwise it uses `wlp` predictions. TIMELINE always uses predictions. Predictions retain
their source label even when they are the only available live-time data.

The prediction curve retains official samples at five-minute boundaries, plus endpoints.
Linear interpolation is allowed only within covered intervals no longer than one hour.
It never extrapolates a curve or synthesizes a sinusoid from high/low events. `wlp-hilo`
provides event times, shared with the existing dashboard. Small differences between a
scrubbed/interpolated level and the rounded high/low table are expected.

Phase 1/2 coordinates and geometry are unchanged: EPSG:3157 relative origin, metres,
web X east / Y up / Z south. **Water Y = heightCD + manifest.chartDatumOffsetMetres**.
The current manifest offset is −3.0 m. This preserves the existing approximate vertical
relationship, including its limitations; no more accurate survey datum transformation
is claimed. Real terrain intersections expose the banks; no shoreline mask is animated.
The world still covers Wreck/Point Grey even though those are not new entries in the
shared beach destination database.

Water height eases exponentially from its displayed value: eight-second time constant
in LIVE, 0.65 seconds in TIMELINE. Refreshes and return-to-live do not snap the plane.
Depth colouring and tide-relative wet sand use the same displayed water-height uniform.
The conditions readout reports the target source value; profiling exposes both heights.

## Sun, sky and weather

`client/src/world/solar.ts` centralizes **SunCalc 1.9.0** for actual latitude, longitude,
date and time. The existing dashboard sun hook also uses it. Solar elevation and
north-clockwise azimuth drive the directional light and the shaders' shared light basis.
Golden colours, twilight and night vary continuously with the computed elevation.
Night retains a small ambient floor so terrain remains explorable.

Open-Meteo's existing request now includes six past hours and 72 forecast hours,
cloud cover, precipitation, liquid rain/showers, visibility and numeric wind bearing.
UNIX timestamps avoid ambiguous or nonexistent daylight-saving hours; daily summaries
still use Vancouver's calendar. The old dashboard's hourly array remains a 24-hour view;
the environment receives the full window from that same request/cache.

Temperature is °C, cloud cover percent, wind km/h and meteorological FROM bearing,
visibility metres. Precipitation and rain are mm/h equivalent rates: current interval
totals are scaled using the provider's interval, hourly totals already span one hour.
Snow contributes to precipitation but is never rendered as rain. Weather interpolation
uses adjacent forecast hours; wind bearing follows the shortest arc across north.

The sky is a small sphere with a procedural gradient, sun disc and two noise layers.
There are no volumetric clouds, shadow maps, extra image assets or postprocessing passes.
Clouds reduce direct light. Wind drives wave-normal travel direction, speed, amplitude
and roughness; it does not displace measured terrain or claim to predict marine waves.
Rain darkens surfaces by at most 12%, modestly changes the water, and adds at most
700 nearby particles (140 on mobile/low-detail devices). Reduced motion disables
particles and animated wave/cloud motion. Background tabs stop drawing and polling.

Visibility controls haze. Missing visibility uses a conservative weather-based estimate:
40 km normally, 18 km in rain, 5 km for a fog condition. Ordinary overcast does not
automatically produce dense fog. Artistic mappings and smoothing live in
`ENVIRONMENT_TUNING` / `visualWeather` in `client/src/world/environment.ts`.
These effects are **visualization, not a marine forecasting model**.

## Cache, freshness and failure behavior

| Data | Existing/shared key | Fresh TTL |
| --- | --- | --- |
| Weather and full forecast window | `weather:{beachId}` | 30 minutes |
| High/low predictions | `tides:{stationId}` | 1 hour |
| Prediction curve | `tides:{stationId}:wlp` | 1 hour |
| Observations | `tides:{stationId}:wlo` | 5 minutes |

The added five-minute cron warms the coastal tide window; cached predictions are not
downloaded every five minutes. Existing weather/high-low cron schedules remain.
Last-good KV records last seven days. Failed fetches back off for 60 seconds; concurrent
requests in an isolate share one promise. KV refresh locks reduce cross-isolate duplication
but are advisory because KV is eventually consistent, not an atomic distributed lock.
Upstream requests time out after ten seconds. The composed response has a 60-second
HTTP cache policy. Clients poll every five minutes and refresh on returning to the tab.
Scrubbing makes **no additional network requests**.

Observation, prediction and weather failures are independent. In order, tide falls back
to a valid prediction, a clearly labelled last-known past value (up to seven days), then
the manifest's static neutral level. Weather uses available forecast coverage, a labelled
current-model hold within six hours, then neutral defaults. No expired observation becomes
a new observation. No stale retrieval time is rewritten to “now”.

Browser memory/localStorage retains validated last-good windows per beach, including
through partial failures. Corrupt cache entries are ignored. Old weather cache records
without the new environmental fields may show neutral weather until their 30-minute
TTL expires or the cron refreshes. Terrain loading is independent of all API responses.

“Sources & freshness” exposes retrieval times, source type, availability and weather units.
`?profile` also exposes `window.__coastProfile()` with normalized state, displayed/target
water height, lighting, haze, wave parameters, rain particle budget and performance.

## Local development and deployment

```sh
pnpm build
pnpm exec wrangler pages dev client/dist --port 8788
# In another terminal, optional hot reload (Vite proxies /api to localhost:8788):
pnpm --filter @van-beaches/client dev
```

Local Wrangler uses local KV, not production KV. Deployment uses the existing Pages
Functions and Worker/KV bindings. Deploy the updated Worker schedule along with Pages
to enable five-minute warming; on-demand caching also works without the new cron.
No deployment or changes to remote infrastructure were performed during implementation.

## Verification and acceptance

```sh
pnpm test
pnpm test:functions
pnpm type-check
pnpm exec tsc --noEmit -p functions/tsconfig.json
pnpm --filter @van-beaches/client exec playwright test e2e/coast.spec.ts --project=chromium --project="Mobile Chrome"
```

The browser acceptance test requires the **real exported Phase 2 assets** and skips
terrain-dependent cases explicitly if they are missing. Its checked-in environmental
fixture is CHS/Open-Meteo data captured on 2026-09-18, not invented geography or a runtime
fallback. It freezes the clock, selects Spanish Banks, scrubs from about 4.03 to 1.39 m CD,
checks the tide plane and solar change, and independently counts newly exposed real survey
atlas cells inside a 1.2 km disk (requiring over 50,000 m²). High/low screenshots and a
JSON attachment record evidence. It also tests API outages, cached fallback, rain budgets,
reduced motion, navigation and renderer disposal on desktop/mobile emulation.

The local acceptance run exposed approximately **1.0522 km²** of known atlas cells between
4.0277 and 1.3860 m CD inside that disk. Sun elevation changed from +42.29° to −15.62°.
This is a count of real raster cells crossed by the displayed tide, not a new survey accuracy
claim. Review artifacts are saved in `3d/output/environment-review/` (ignored by Git).

Unit tests cover QC filtering, observation-vs-prediction selection, stale data, missing
coverage, cache coalescing/backoff, DST timestamps, solar day/night, interpolation,
wind bearing, bounded effects and frame-rate-independent water smoothing.
`pnpm coast:profile` now exercises live timeline data instead of manual tide presets.
Browser emulation/software rendering is not a physical-mobile performance claim.

The build, type checks and semantic lint pass. The checkout's full `pnpm check` also runs
formatting and reports pre-existing CRLF/LF differences in unrelated files; these were not
mass-reformatted as part of Phase 3.

Provider references: [CHS IWLS API](https://api-iwls.dfo-mpo.gc.ca/swagger-ui/index.html),
[CHS QC flags and request limits](https://www.tides.gc.ca/en/web-services-offered-canadian-hydrographic-service),
[Open-Meteo variables and time parameters](https://open-meteo.com/en/docs),
[SunCalc conventions](https://github.com/mourner/suncalc).
