# Coastal world: production and release operations

The world uses one metre-based origin and one tide reference throughout. The existing
[coastal pipeline](README.md), [web export](WEB.md), [environment](ENVIRONMENT.md), and
[regional terrain](REGIONAL.md) documents describe the source acquisition and numerical
contracts. This guide covers the integrated system and its release checks.

```text
City LiDAR + CHS NONNA + supplemental ground
  -> measured coastal terrain / bathymetry / depth atlas
NRCan regional DEM -> regional terrain + mountain horizon diagnostics
Building footprints + heights / roads / bridge records / land cover
  -> urban source receipts -> coarse skyline + detailed urban export
Measured coastal elevations + connected marine coverage -> marine mask
  -> shared Blender world and versioned web assets
  -> streamed terrain + ocean + city / bridges + regional mountain geometry
CHS tide + Open-Meteo weather + astronomical sun
  -> shared environmental state -> water / atmosphere / estimated crowds
Authored geographic routes + marine coverage + bridge envelopes
  -> optional simulated vessels / aircraft / road movement
```

The renderer does not run GIS, Blender, source discovery, or a live vessel-tracking
service. Movement and beach activity are illustrative estimates, not observations.
Unknown source coverage and approximate vertical datum conversions remain explicit;
this is a visualization, not a navigation or engineering surface.

Unknown survey cells on the sourced sea side of OpenStreetMap's coastline may show an
optical ocean surface. The [OSM coastline convention](https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline)
defines sea on the right and maps a high-water boundary. This is a two-dimensional
affiliation fallback only where measured elevation is absent; it does not supply a bed
height or a tide-responsive shoreline in those gaps. Every known land/intertidal/seabed
cell continues to use its measured tide-connectivity threshold. Closed polygonization,
unambiguous directed coastline sides and a measured deep NONNA seed are required.
Land-side gaps, islands, ambiguous geometry and unseeded regions remain excluded.

`marine-connectivity.tif` retains the original measured minimax thresholds. The separate
`marine-surface.tif` adds optical columns, and blue=255 in the published RGBA mask flags
those columns as optical only. The depth atlas and `coast.tif` remain unchanged. Vessel
navigation still requires measured depth; an optical surface does not permit vessel travel.
The fixed mapped waterline inside an unknown gap is an explicit limitation, not an inferred
intertidal survey. Source receipts are in `data/raw/marine`; export and inspection reports
are `data/metadata/latest-marine-export.json` and `latest-marine-optical-review.json`.

## Regenerate only the subsystem that changed

Run commands from the repository root with the project's Python environment and pinned
Node dependencies. Keep raw data and generated assets outside Git as before.

| Change | Operation | Reuses |
| --- | --- | --- |
| Coastal source/configuration | `python 3d/pipeline.py process`, then `blender` and `export` | Downloaded LiDAR/NONNA and imagery |
| Blender presentation only | `python 3d/pipeline.py blender --lod overview` | Processed coastal and regional meshes |
| Regional DEM | `python 3d/pipeline.py regional` | Coastal export and cached bounded DEM reads |
| Regional export only | `python 3d/pipeline.py regional-export` | Processed regional meshes |
| City / roads / bridges | `python 3d/pipeline.py urban` | Cached source responses, terrain and regional products |
| Marine connectivity / mask | `python 3d/pipeline.py marine` | Coastal measured depth atlas |
| Runtime, weather, activity or moving entities | Normal TypeScript build | All published world assets |
| Release identity and integrity inventory | `node scripts/coast-assets.mjs stamp` | All exported assets; no geometry work |

Use `--refresh` deliberately for source acquisition. Retain prior receipts when comparing
data revisions. After any exporter replaces `manifest.json`, generate a new build record.
Do not edit a stamped manifest or overwrite a published version's asset directory.

Run at most one Blender, GIS generation, or software-WebGL browser process at a time on
constrained machines. Independent TypeScript, documentation, source inspection and small
unit tests can run alongside it. Use the overview Blender scene for review before deciding
whether a detailed rebuild is necessary. None of the browser acceptance tests rebuild assets.

## Release assets and provenance

`node scripts/coast-assets.mjs package` validates the terrain, optional marine mask and
urban products, then writes `world-build.json`, `3d/output/coast-web.tar.gz` and its SHA-256
receipt. `stamp` writes the same provenance record without making the archive.

The world ID is derived from the build record content. The record includes:

- SHA-256 and byte length for every manifest, tile, texture, urban export, decoder and notice.
- Pipeline/configuration/lockfile fingerprints and the Git revision available when packaged.
- Coastal source records, City LiDAR 2022 and CHS NONNA acquisition evidence fingerprints.
- Regional DEM metadata and urban source receipts, including road and bridge sources.

The pipeline file fingerprints capture local changes even when HEAD has not changed.
Offline evidence fingerprints refer to retained acquisition records, not embedded raw GIS.
Missing historical evidence is recorded as absent; stamping does not fabricate provenance.
Archive SHA-256 pins the complete release, including the build record itself.

`prepare` and `verify` validate a present build record against every referenced file.
Legacy unstamped local exports remain usable for inspection; stamp them before release.
Source/build changes require an explicit new package. An ordinary web deployment restores
the pinned archive using `COAST_ASSET_ARCHIVE_URL` and `COAST_ASSET_ARCHIVE_SHA256`; it does
not regenerate the world. For hosted assets set `VITE_COAST_MANIFEST_URL` to an immutable
version directory. Its adjacent `world-build.json` must match the hosted manifest.
The archive path verifies every file locally; hosted verification checks the manifest and
build identity without downloading the entire world in each application build.

CI runs small Python validation separately from web builds. The browser job restores the
same generated world artifact produced by the application build, uses one worker and saves
acceptance captures/traces for seven days. A repository checkout with no generated world
still tests accessible fallback; world-dependent tests explicitly skip until assets exist.
For a hosted-only release, restore the matching archive locally before running world tests.

## Runtime quality and reliability

`client/src/world/quality.ts` defines LOW / MEDIUM / HIGH budgets. Defaults favor LOW on
software renderers and devices reporting at most 2 GB memory, MEDIUM on coarse-pointer or
4 GB devices, and HIGH otherwise. Coarse coast, skyline, bridges and mountain silhouettes
are the persistent geographic context. Optional activity and refinement consume the
remaining budget. Tier policy covers pixel ratio, concurrent loads, detail tiles, estimated
GPU storage, draw calls, people, moving entities and weather particles.

LOD replacement preserves the previous representation until the replacement has loaded.
Terrain selection uses distance hysteresis; skyline representations keep source positions
and heights. Pixel ratio can fall further on slow renderers. GPU storage is an estimate of
known geometries and textures, not a hardware memory reading; profile actual target devices.

Use `/coast?profile` for local diagnostics. The runtime snapshot includes render cost,
tile loading/failures, quality, geographic camera pose, environmental timestamps/staleness,
urban and movement state. `WorldTelemetry` adds time to first render, selected-beach detail
timing and aggregate terrain/building/regional/WebGL/water error counts. It stores no user
identifier, writes no persistent analytics and sends no telemetry requests.

The beach pages remain the non-WebGL route to important conditions. Controls are keyboard
accessible, status is readable outside canvas, and reduced motion removes camera flights
and decorative movement. Missing detail retains coarse geography; context or shader failure
exposes a reload action and ordinary beach navigation. Source freshness/fallback status is
visible with the environmental controls.

## Acceptance and visual review

Run release browser tests after GIS/Blender work has stopped:

```sh
node scripts/coast-assets.mjs verify
pnpm --filter @van-beaches/client exec playwright test e2e/production.spec.ts --project=chromium --workers=1
```

`production.spec.ts` captures Wreck, Spanish Banks, Jericho, Kitsilano, English Bay, Third
Beach and overview at 0.5, 1.5, 3, 4.5 and 5 m CD. It fixes time, reduces motion and uses
LOW quality for repeatability. It verifies tide conversion, finite camera poses, rendered
geometry and absence of tile/shader errors, saving each image and its runtime diagnostics.
Separate cases exercise failed terrain, failed detailed city, slow manifest loading,
ocean shader failure and context loss. Existing coastal tests cover unavailable WebGL,
environment outages, stale fallback, reduced motion and independently measured tidal-flat area.

Captures alone are review evidence, not a passing image comparison. On a fixed OS/browser/GPU
configuration, set `COAST_VISUAL_BASELINES=1` and approve initial images using Playwright's
`--update-snapshots`; retain those reviewed references for subsequent comparison runs.
Never accept replacement baselines just to make a failing comparison pass. Software and
hardware WebGL output differ, so keep the baseline platform stable.

Review natural and depth views for water through dry terrain, disconnected foam, floating
edges, z-fighting and transparency order. Compare city/bridge positions and tower heights,
shoreline shape, mountain ridges and camera orientation. Numerical assertions and image
differences cannot certify local geographic recognition: a Vancouver resident should review
the images without labels. Record that qualitative review separately from automated results.
