# Vancouver coast web runtime

Phase 2 adds `/coast` to the existing Van Beaches React application. The header links into the
world from Discover and from each beach page; `/coast?beach=spanish-banks` is shareable and browser
Back/Forward retains beach selection. Eight coastal destinations are derived from
`shared/src/data/beaches.ts`; regional export adds Wreck Beach from its existing measured observer.
Trout Lake remains available on its existing page, outside the coastal model.

The integrated world adds [measured regional mountains](REGIONAL.md),
[coastal topology](COASTAL-TOPOLOGY.md), [urban context](URBAN.md), and
[simulated harbour movement](PHASE7-SOURCES.md). Buildings represent the City's **2009**
footprint/height dataset. Vessels, aircraft and optional bridge traffic are simulated even when
weather is LIVE; SeaBus is suppressed where the surveyed marine corridor cannot be verified.
See [PRODUCTION.md](PRODUCTION.md) for current quality tiers, releases and acceptance checks.

## Repository inspection and integration choice

The app is a React 19 client-rendered SPA with React Router, Vite, Tailwind, pnpm workspaces and
Cloudflare Pages. Existing routes are `/discover` and `/beach/:slug`; the shared data contains IDs,
slugs and WGS84 locations. Pages Functions and a scheduled Worker already serve weather and IWLS
tides from KV. Phase 2 initially used manual water controls. [Phase 3](ENVIRONMENT.md) now
connects those same integrations to LIVE/TIMELINE controls, weather and solar lighting.

Three.js runs inside a React effect, with React providing the controls and routing. For this small
scene graph an imperative renderer avoids adding React Three Fiber alongside a separate imperative
tile scheduler. The route and its Three.js dependency are lazy-loaded. The existing frontend stays
intact. The PWA explicitly excludes terrain, decoders, and the lazy coast bundle from precaching.

Phase 1 supplies saved detailed/overview Blender scenes, 500 m geographic tiles, 10 m overview and
2 m coastal working meshes, packed City 2022 imagery, source-resolution metadata and a local metre
origin. These are reused. Fine sampling does not increase NONNA's native measurement accuracy.

## Build and run

Install the repository's pinned pnpm dependencies and the Phase 1 Python environment. Both saved
Blender worlds and their matching processed GIS outputs must exist. If necessary, build both using
the Phase 1 instructions before exporting:

```sh
pnpm install --frozen-lockfile
python 3d/pipeline.py urban
python 3d/pipeline.py marine
python 3d/pipeline.py blender --threads 4
python 3d/pipeline.py blender --lod overview --threads 4
pnpm 3d:export
# Equivalent: make 3d-export (PYTHON may point to 3d/.venv/bin/python)
python 3d/pipeline.py finalize --threads 4
pnpm coast:verify
pnpm --filter @van-beaches/client dev
```

On Windows activate `3d/.venv/Scripts/Activate.ps1`, or call its Python executable directly.
The build finds Blender in the normal Windows installation directory; elsewhere put it on PATH
or set `BLENDER`. Node 22+ must be on PATH (or set `NODE`). Close Vite dev while regenerating assets
on Windows: its filesystem watcher can prevent atomically replacing the manifest. Vite preview
serves `client/dist` and does not lock the export source directory.
Run the commands sequentially on constrained hardware. `finalize` refreshes native cameras and
evaluated tide bindings and verifies all four existing saved scenes after urban/marine and export.
It does not regenerate terrain or add missing scene geometry. When the native urban/moving
layers already exist, those presentation updates do not require another full Blender rebuild.
On a first build with no published coastal manifest, follow [README.md](README.md) to generate
the initial terrain export before publishing marine connectivity or integrating dependent layers.

Export runs these stages:

1. `export/export_world.py`, executed by Blender, reads the actual saved terrain/seabed/shoreline
   objects. It preserves indexed geometry, local transforms and missing-survey holes. Water, debug
   objects, cameras and the optical volume never enter the GLBs.
2. `export/optimize_assets.py` invokes the lockfile-pinned Node optimizer. LOD 0 simplifies the 10 m
   meshes with locked topological borders; LOD 1 retains the overview source; LOD 2 retains coastal
   source geometry. Positions use 16-bit quantization, under 8 mm per 500 m tile. This encoding
   tolerance is unrelated to source survey accuracy.
3. `export/generate_manifest.py` publishes a versioned JSON contract and data notices. It checks
   the canonical beach source hash and derives navigation metadata, including nearby measured
   dry-ground viewpoints. An elevation PNG from the matching GIS raster supports water colour.
   It is not a shoreline mask: the runtime ocean intersects the exported terrain geometry.
4. Existing regional products and independently cached coarse/detailed urban JSON are republished.
   The marine exporter derives tide-dependent connectivity thresholds from measured coastal
   elevations. This threshold mask preserves moving tidal shorelines and rejects inland basins
   without an adequately submerged connection; unknown survey cells remain barriers.

Generated output lives in `client/public/coast-assets/`, ignored by Git. Individual hashed GLBs,
the elevation PNG and notices are portable to an object-storage/CDN origin. `.blend` files are
never delivered to a browser. Build measurements remain in `data/metadata/latest-web-export.json`.
Asset contents and the manifest are deterministic for the same sources and pinned tools; measured
build duration is recorded separately from the runtime manifest.

## Runtime contract

`client/src/world/types.ts` describes manifest version 1. Each tile has an ID, LOD, asset URL,
SHA-256, bytes, triangle count, world-space bounds, projected/geographic source bounds, local
transform, spacing and native source-resolution metadata. Each destination reuses its shared ID
and slug and carries `worldPosition`, `cameraTarget`, `cameraApproach`, `preferredAltitude` and an
optional measured `beachView`. Shared beach names/descriptions remain canonical; the additional
Wreck inspection destination comes from measured regional observer metadata.
`manifest.urban` references separately hashed skyline/detail JSON and their source receipts;
`marineTexture` references the numeric marine-connectivity atlas. See [URBAN.md](URBAN.md)
for the urban geometry schema and [COASTAL-TOPOLOGY.md](COASTAL-TOPOLOGY.md) for threshold encoding.

`coordinates.ts` is the browser's coordinate boundary:

* Blender `[east, north, up]` becomes Three.js `[east, up, -north]`, a right-handed rotation.
* Both use metres relative to the Phase 1 origin, WGS84 49.28, −123.19; projected origin
  approximately `[486182.1092244953, 5458599.544352132, 0]` in EPSG:3157.
* Proj4 includes the same NAD83(CSRS)/WGS84 seven-parameter operation selected by Phase 1 PROJ.
  Tests compare independent pyproj reference coordinates to centimetre tolerance.
* The world vertical datum remains CGVD28GVRD. `worldY = tideCD − 3.0`, the existing approximate
  local visualization relationship, not a new survey conversion. The original verification presets are 0.5, 1.5, 3, 4.5, 5 m CD; Phase 3 drives height from CHS.

`CameraNavigation` owns animation and state separately from destination data and OrbitControls.
Flights use a smooth easing curve and an altitude arch, with no roll. Input cancels flight;
reduced motion goes directly to the destination and freezes cosmetic waves. The near clipping
plane increases at regional altitude to retain depth-buffer precision at the shoreline. Free
exploration is bounded to the AOI; downward terrain checks maintain clearance over loaded geometry.
These checks are not collision certification over unknown survey gaps.

## Streaming, water and mobile

The coastal layer has 476 spatial cells and 1,130 tile/LOD assets, alongside independent regional
and urban assets. Coarse tiles stream in view order with
bounded concurrency. Nearby detail replaces coarse geometry only after decoding successfully.
LOW / MEDIUM / HIGH policies in `client/src/world/quality.ts` bound resident detail, urban LOD,
estimated GPU storage and optional movement. Hysteresis reduces boundary churn; stale fetches
are aborted, late results disposed, and failed requests receive bounded backoff plus a UI retry.
The bounded regional layer remains cached in GPU memory; distant detailed geometry/textures are
disposed. No full-resolution world is downloaded on entry.

Water is a separate flat ocean with tide-relative terrain intersections. Natural mode uses depth
absorption colour, Fresnel reflection and animated normals; it does not simulate fluid or displaced
waves. Depth mode reveals shaded seabed bands at 0–2, 2–5, 5–10, 10–20 and 20+ metres, calculated
from surface elevation minus actual terrain elevation. Exposed sand stays land-coloured. Photographs
fade in above the maximum tested tide plus margin, preserving the real intertidal geometry.
Opaque terrain writes depth, water depth-tests, and the current water elevation is compared with
the marine connection threshold. Shallow-water colour, shore foam and wet sand remain tide-relative.
The mask does not fill survey gaps or establish a seabed depth outside known coverage.

Touch supports orbit, pinch zoom and two-finger pan. Quality tiers cap pixel ratio and frame rate,
reduce costly refinement on small/software devices, and lower pixel ratio when frames remain slow.
Hidden tabs pause rendering. The profile view exposes active budgets and measured costs.
Resize, route teardown, aborted decodes and WebGL context loss are handled. Missing model data or
unavailable WebGL displays a reload action and links to the existing beach pages.

## Compression and measured performance

The current complete export contains about **58.4 MB of GLBs**; the complete regional layer is
**4.89 MB / 202,587 triangles**. The largest tile is **431 KB**, well below Pages' 25 MiB per-file
limit ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)). The manifest and elevation atlas add their own initial payload; the profile reports file
transfer sizes separately. All numbers are decimal MB unless stated otherwise.

`pnpm coast:benchmark` measures Draco and Meshopt using representative real tiles. Draco reduced
the sampled coastal tile from 320 KB raw to 7.7 KB, versus 38.6 KB with Meshopt, with approximately
2.2 ms versus 0.4 ms Node decode time. Use Meshopt for fast regional streaming and worker-decoded
Draco for detail. Draco's 251 KB WASM/wrapper payload is fetched only when detail is requested.
These microbenchmarks are not browser frame times.

WebP reduces full-size tile imagery from about 52 MB PNG to 4.9 MB. Regional imagery is reduced to
128 px; nearby imagery remains 256 px. KTX2/Basis was evaluated against actual residency budgets:
regional textures, the elevation atlas and bounded detail fit within tens of MiB. It is deferred
until GPU texture residency is a demonstrated bottleneck; no claim of a KTX2 encoder benchmark is
made. The source measurements are retained in `data/metadata/web-compression-benchmark.json`.

Use `/coast?profile` for frame time, draw calls, triangles, resident tile/texture counts, estimated
GPU bytes and downloaded geometry bytes. Phase 3 exposes environmental source/freshness,
wave parameters and atmosphere diagnostics. `window.__coastProfile()` exists only in this mode. Estimates cover geometry and
texture storage, not driver allocation, framebuffer overhead or total browser memory.

```sh
pnpm --filter @van-beaches/client build
pnpm --filter @van-beaches/client preview --host 127.0.0.1 --port 5173
pnpm coast:profile
# On Windows, COAST_GPU_ANGLE=d3d11 enables the installed GPU in headless Chromium.
# COAST_URL selects another built-site URL. Default is http://127.0.0.1:5173.
```

The earlier Phase 2 Windows Chromium/RTX 4070 Ti benchmark reached approximately 60 fps at 1440×960 for both
regional and Spanish Banks views, and 30 fps with Pixel 5 emulation at the mobile quality setting.
It downloaded no detailed tiles at overview and released detail on return. Software-rendered
Chromium is also tested with automatic low detail. Pixel 5 emulation verifies layout/touch and
budgets; it does not establish physical-phone battery, thermal or GPU performance. A physical iOS
and Android pass and network-throttled field measurements remain release checks. Screenshots and
full measurements are generated in `3d/output/web-profile/`; a compact report is tracked under
`data/metadata/latest-web-profile.json`.
These historical measurements predate the integrated urban, regional and moving-entity layers.
They do not establish current browser acceptance; rerun the integrated checks in
[PRODUCTION.md](PRODUCTION.md) and retain their captures and reports.

## Hosting and release

The client build verifies any local export before copying it. Small frontend-only checkouts can
still build and test the explicit unavailable-model fallback. Deployment is stricter: the Pages
workflow verifies coastal assets before publishing, so missing assets cannot silently ship.

```sh
pnpm coast:package
# 3d/output/coast-web.tar.gz + coast-web.tar.gz.sha256
```

Publish that bundle to your chosen release/object storage and set GitHub repository variables
`COAST_ASSET_ARCHIVE_URL` (HTTPS) and `COAST_ASSET_ARCHIVE_SHA256`. The existing build restores and
checks the pinned archive. The bundle only includes referenced assets, so older export files do not
bloat deployment. No raw GIS data or Blender installation is required in frontend CI. Local build
preparation removes only obsolete generated, hash-named GLBs/atlases from the output directory.

Alternatively host the extracted files in a versioned CDN directory and set
`VITE_COAST_MANIFEST_URL` at build time. Relative assets/decoders/notices resolve against that URL.
Enable GET CORS for the site origin, serve GLBs as `model/gltf-binary`, WASM as `application/wasm`,
PNG/WebP with their normal MIME types, and JSON as `application/json`. Keep hashed assets immutable,
revalidate the manifest, and publish assets before the manifest. `client/public/_headers` provides
the same policy for Pages-hosted files. Preserve the full `NOTICE.txt` in every release.

No bundle has been uploaded and no live website has been deployed by this implementation.

## Verification and limits

```sh
pnpm type-check
pnpm test
pnpm --filter @van-beaches/client exec playwright test e2e/coast.spec.ts --project=chromium
python -m pytest -c 3d/pyproject.toml 3d/tests
pnpm coast:verify
```

Coast tests cover coordinate agreement, datum presets, flight cancellation/reduced motion,
streaming budgets, cached environmental requests, real GLB decoding, route history, detail teardown, missing
assets and unavailable WebGL. Real-model browser tests skip only when no local export is installed;
fallback tests always run. Python tests cover atlas signs/coverage and real regional budgets.

The model retains the coastal survey's measured/interpolated coverage and unknown holes.
City 2009 footprints/heights supply separate building massing; OSM supplies roads, bridge alignment,
waterfront and park coverage; NRCan DEMs supply the regional mountain geometry. Bare-earth imagery
remains terrain appearance and does not provide current building geometry or individual trees.
Unknown marine coverage suppresses simulated routes, including SeaBus, rather than allowing vessels
through unverified corridors. Optical water outside known coverage does not assert a seabed depth.
This derivative is not for navigation; complete source licences and attribution are in `NOTICE.md`.
