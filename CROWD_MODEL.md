# Estimated beach activity (Phase 4)

The coast displays **Estimated activity: Quiet / Moderate / Busy / Very busy** for the selected beach and time, with **Low confidence** always visible. Expand the label for the limitations. Characters illustrate activity, not identifiable or tracked people. Numeric attendance is intentionally hidden in the public UI until calibration can support a defensible range.

No Google Places attendance API, Google Maps scraping, private API, webcam analysis, or personal location data is used. Inspection of the existing environment services and client hooks found no popular-times source. This implementation uses the existing environmental state and local configuration only.

## Model and provenance

`client/src/world/crowd/crowd-baselines.json` contains the versioned design priors. All capacities, hourly curves, seasonal factors, category thresholds and response weights were authored for this visualization in September 2026. They are **not measured attendance, official capacity limits, or scientifically validated coefficients**. Capacity means a reference for translating density into a rough optional estimate, not a safety limit.

`model.ts` calculates a product of inspectable factors, clamped to 0–1:

* Hourly weekday/weekend curve, interpolated across the hour (including midnight).
* Month, beach baseline and optional calibration scale.
* Piecewise linear temperature (°C), precipitation (mm/hour) and wind (km/hour) responses; cloud cover penalty.
* Darkness reduction and a beach-specific sunset boost using the existing SunCalc implementation.
* A modest low-tide modifier for the beaches configured as tidal.

The calendar always uses `America/Vancouver`, regardless of the browser timezone. Weekend days use the weekend curve. `holidayDates` accepts reviewed local `YYYY-MM-DD` dates; it starts empty deliberately. Callers can also provide an explicit `holiday` override. There is no assumed holiday feed and no event attendance adjustment. Add dates with their source and review date when maintaining this configuration.

The normalized state includes `normalizedDensity`, `category`, `confidence: "low"`, `estimatedPeople`, `basis`, `modelVersion` and an explanatory `factors` record. Optional counts are rounded to the nearest 25 to avoid false precision; a rounded zero is not evidence of an empty beach. `estimatedPeople` is never used to choose how many characters to draw. Category thresholds are 0.2, 0.5 and 0.78 and are also design priors.

Neutral weather contributes no weather multiplier. Stale/last-known weather retains its available signal but gets `limited-data` messaging. Stale tide does not get a low-tide boost. All predictions remain low confidence even with fresh weather because the attendance model itself is uncalibrated. Nearby beach populations share the currently loaded regional weather/tide state; this is not beach-specific observation. No crowd label appears for overview or destinations without a model.

## Calibration workflow

1. Record voluntary manual aggregate observations with `beachId`, `observedAt` (ISO time with timezone), `zoneId` or explicitly `whole-beach`, `estimatedPeopleMin`, `estimatedPeopleMax`, `method`, `observerNotes`, `environmentSnapshot`, and `modelVersion`. Do not collect identities or imply that a partial zone count covers a whole beach.
2. Keep observation provenance and uncertainty with the record. There are no fabricated observations bundled here.
3. Compare predictions with ranges over multiple dates and weather conditions. Hold back some dates for evaluation. Avoid calibrating both reference capacity and baseline scale to the same observations without fixing one; their effects overlap.
4. Tune each beach's `calibrationScale` and, when supported, optional `weekdayCurve` / `weekendCurve` arrays (24 hourly values). The shared response tables can also be revised. Preserve the old version and document source, scope and changes in the JSON provenance and version history.
5. Review residual errors, seasonal coverage and unusual events before exposing numbers or increasing confidence. The initial model deliberately has no automatic confidence promotion or inference of actual attendance.

## Zones and behavior

`activity-zones.json` is the portable source for semantic polygons. Coordinates are `[east, south]` offsets in metres from each destination's manifest `worldPosition`; ground height comes from the existing survey atlas. This JSON can be imported into Blender/GIS without the renderer. `buildActivityMask()` exports plain serializable cells (`x`, `y`, `z`, `zone`) for offline inspection or conversion. To convert to geographic coordinates use the manifest origin and `createCoordinates().worldToLatLon()`.

The polygons are coarse hand-authored visualization envelopes, not surveyed court, path or permission boundaries. Review and replace them with better GIS or Blender masks as those become available. The existing atlas has roughly 10 m sampling; a 4 m activity grid does not create more source accuracy. A cell requires coverage, a plausible elevation and a shallow slope. No characters spawn where height data is missing. Restricted polygons override other zones (or the explicit `excludeFrom` IDs). Paths and lawns have their own zones. Every movement step stays inside its polygon and respects restricted areas, slope and water depth.

* Kits uses clusters of sitting/standing/sunbathing agents and a volleyball zone.
* Spanish Banks spreads walking activity across a much wider area. Exposed-flat cells become available as the rendered tide falls.
* English Bay emphasizes movement along a narrow seawall envelope and an evening activity boost.
* Wreck has a less structured `natural` behavior/baseline profile ready for future use. **Wreck is not a destination in the current shared beach catalog or exported manifest; no Wreck characters are fabricated outside that coverage.** Adding it requires a destination export and reviewed masks.
* All eight existing coastal destinations have explicit masks and social, spread, urban or natural profiles as configured. Trout Lake is outside this coastal export.

Dogs are disabled pending reviewed permission masks; no assumption is made that a beach-wide dog-friendly flag establishes where or when dogs may be present. Activity presets describe space usage only, never visitor demographics.

Dry activities require ground above the current smoothly animated tide plus a small clearance. Water activity requires fresh weather/tide, a warm enough air-temperature signal, low precipitation/wind and daylight; these are visual choices, **not swimming-safety advice**. Waders and swimmers use separate shallow depth bands. Submerged dry cells and weather-inappropriate water agents retire gradually.

## Animation, transitions and budgets

`tuning.ts` contains representation budgets, animation rates, movement speeds, zone/activity compatibility and activity weights. `characters.ts` shares seven procedural animations: idle, walk, sit, lie, wade, swim and volleyball. No skeletons, animation mixers or individual character materials are allocated. Character colors are decorative.

* Desktop: at most 360 resident agents globally, up to `round(260 × density^0.8)` requested for one beach.
* Mobile/coarse pointer, low-memory devices, software GPU or the existing slow-frame fallback: 120 resident agents, up to `round(85 × density^0.8)` per beach. An already resident desktop pool fades down when the fallback activates.
* Close: six-box characters, 24 Hz updates; medium: two-box silhouettes and 10 Hz animation; mobile: silhouettes, 8 Hz updates.
* Around 700 m: crossfade to point impostors. Beyond 2200 m desktop / 1500 m mobile: cull. Frustum culling is per agent. Overview has no crowd draw after the population fades out.
* The complete crowd layer needs at most three draw calls, with one instanced mesh per character LOD and one points batch. No character shadows.
* Density transitions use stable agents and a 2.5-second opacity ramp, with distance crossfades between representations. At most four new candidates are processed per frame. Retiring agents count against the global budget, so rapid beach switches cannot allocate unbounded overlapping populations.
* Reduced motion freezes locomotion and procedural animation but preserves density fades. The existing runtime suspends updates in hidden tabs and disposes GPU buffers/materials on unmount.

The numeric headcount and representation ratio are deliberately independent: a model estimate of 1,000 people does not allocate 1,000 characters. Missing survey imagery disables placement without disabling the textual model estimate or coast navigation.

## Verification

Run `pnpm --filter @van-beaches/client exec vitest run src/world/crowd/crowd.test.ts` for model, calendar/DST, calibration, masks, depth constraints, reproducibility, movement and fade checks. Run `pnpm --filter @van-beaches/client exec playwright test e2e/crowds.spec.ts --project=chromium --workers=1` after preparing the real coast assets. Repeat with `--project="Mobile Chrome"` for the mobile budget. Browser tests use synthetic weather with the **real exported geography**, capture screenshots and attach runtime diagnostics:

* Kits: hot Saturday, July 4, 2026 at 15:00 PDT → Very busy; volleyball/social mix.
* Spanish Banks: rainy Tuesday, July 7 at 09:00 PDT → Quiet; no swimming/wading.
* English Bay: July 7 at 20:45 PDT, near sunset → Busy; stronger urban/evening activity.

`/coast?profile&beach=kitsilano-beach` exposes `window.__coastProfile().crowds`: model factors, mask coverage, resident/target counts, activities and representation counts. This is an engineering diagnostic, not a public attendance claim. Physical mobile hardware performance still needs device testing; browser emulation does not establish a frame-rate guarantee.
