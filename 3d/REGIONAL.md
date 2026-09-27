# Phase 5: regional terrain and beach horizons

The regional layer is actual NRCan elevation geometry. Its coordinates, tide reference,
sun direction, weather uniforms and asset lifecycle extend the coastal implementation.
There are no panorama cards or independently positioned mountain scenes.

## Phase 1–4 inspection

The detailed AOI is −123.28 to −123.10 longitude, 49.245 to 49.32 latitude, snapped to
500 m projected tile bounds. The projection is **EPSG:3157, NAD83(CSRS) / UTM zone 10N**.
The origin at (−123.19, 49.28) projects to approximately (486182.109, 5458599.544) m.
Blender axes are east/north/up; web axes are `(east, up, -north)`. One unit is one metre.
Regional configuration is separate from `world.yaml` so it does not invalidate the coastal
LiDAR cache or introduce a second origin. Every regional build verifies the coastal export hash.

The detailed pipeline uses 2 m coastal land and 10 m overview geometry in 500 m tiles.
The web exporter adds coarse LOD 0; the runtime retains coarse tiles and streams bounded
LOD 1/2 detail near the camera. Assets are checksummed GLBs and a measured depth atlas,
served locally or from the existing release bundle/CDN. Geographic camera anchors and
beach views come from the existing exported manifest. The camera has a 45 km orbit-distance
limit, a target-height limit of 250 m, and adaptive near clipping; its altitude is consequently
approximately bounded by orbit distance, not a separate flight ceiling. Regional work does
not enable North Shore ground-level exploration.

Phase 3 already supplies solar direction/colour, ambient light, visibility-dependent haze,
rain and tide through shared uniforms. Mountains consume those exact objects. Camera far
clipping is extended from 60 to 240 km, sky radius from 48 to 220 km, and the ocean now
covers 320 km with subdivisions for curvature. Coastal and mountain geometry retain their
unbent source elevations in their files.

## Sources and reproducibility

Run in the existing Python environment, after the coastal export:

```powershell
& 3d/.venv/Scripts/python.exe 3d/pipeline.py regional
# Export existing processed regional terrain again:
& 3d/.venv/Scripts/python.exe 3d/pipeline.py regional-export
# Include mountains in the editable Blender scene:
& 3d/.venv/Scripts/python.exe 3d/pipeline.py blender --lod overview
```

`regional --refresh` refreshes catalogue discovery. Retain the previous catalogue and raw
cache when comparing releases. `export` reattaches a previously processed regional layer
after rebuilding the coast. `pnpm coast:verify` and `pnpm coast:package` include regional
GLBs and diagnostic data. Raw data, meshes, generated GLBs, charts and Blender files retain
the existing ignored-artifact policy.

Discovery uses NRCan's [STAC API](https://nrcan.github.io/cloud-optimized-geospatial/pystac-client/),
selecting the `dtm` asset from `hrdem-mosaic-2m` and `mrdem-30` collections. Rasterio reads
bounded COG windows at appropriate overview levels through HTTP range requests; it never
downloads the national COG or loads a regional 2 m grid. The
[HRDEM Mosaic specification](https://download-telecharger.services.geo.ca/pub/elevation/dem_mne/HRDEMmosaic_mosaiqueMNEHR/HRDEM_Mosaic_Product_Specification.pdf)
documents the 2 m mosaic. The
[NRCan elevation strategy](https://natural-resources.canada.ca/maps-tools-publications/satellite-elevation-air-photos/national-elevation-data-strategy)
identifies MRDEM as the 30 m Canadian DTM/DSM product with national coverage, combining
lidar and Copernicus sources. Its DTM fallback must not be represented as equally accurate
bare-earth lidar in every region.

`data/metadata/regional-sources.json` preserves the exact catalogue query, response items,
asset URLs and access time. **Valid DTM pixels establish coverage, not catalogue footprints.**
HRDEM is preferred at every pixel. MRDEM fills missing pixels, with source codes 1 and 2;
unknown is code 0. Each cached extraction has a `.source.json` receipt containing actual
contributor IDs, counts, bounds, resolution and SHA-256. The source-code array is retained
beside its elevations. `latest-regional-build.json` reports source counts and processing
spacing for every selected 4 km region. Export groups are 8 km for fewer draw calls;
source debug colours identify groups containing fallback data, not individual source pixels.

Both products have CGVD2013 heights. The existing approximate local CGVD28GVRD world uses
**−0.12 m** added to regional heights, from the Phase 1 Vancouver station relationship
(CD→CGVD28 −3.00 m; CD→CGVD2013 −2.88 m). This is explicitly a local visualization
approximation, not a spatially varying regional datum conversion. Low open terrain edges
have render-only walls down to −20 m to meet all configured tides; these are not inferred
bathymetry. The detailed coastal footprint is cut out of regional faces. Unknown coverage
is retained and triangles crossing unknown grid samples are rejected.

## Visibility, resolution and simplification

A 100 m survey extends 140 km from the original origin in each direction. Rays extend up to
140 km from each beach. The survey is an analysis resource, **not the delivered rectangular
world**. Only tiles with terrain visible above the accumulated nearer-terrain/ocean horizon
are selected. Repeated analysis with the selected finer grids adds newly exposed terrain
until selection converges. This matters particularly at Wreck, where finer near-shore
elevations expose some distant southern terrain. NRCan MRDEM includes some adjoining
terrain beyond Canada's boundary; source ownership remains explicit.

Selected source-processing targets are 25 m within 15 km of a beach, 50 m within 30 km,
and 100 m farther away. These are effective rendering grids, not source accuracy claims.
They were chosen to bound memory and geometric error; no 1–2 m regional mesh is produced.
Adjacent grids use shared survey-edge heights to join different processing resolutions.

LOD construction is an adaptive Delaunay TIN. It inserts the worst residual sample in each
triangle, preserving measured heights, common tile boundaries and a neighbourhood around
every sampled visible horizon winner. Vertical tolerance increases with distance; a separate
0.02° observer angular-error limit within 5 km prevents nearer simplified faces from spuriously blocking
distant peaks. Both LODs are checked against the processed DEM horizon with a maximum
0.06° acceptance limit. Validation uses only selected delivered grids, so omitted geography
cannot be concealed by falling back to the survey in the rendered-side comparison.

The source and simplified profile comparison samples azimuth every 0.25° and distance every
50 m. This is approximate terrain visibility; it does not resolve every narrow peak between
rays, vegetation, buildings, atmospheric refraction or visibility beyond the survey extent.
Some southern rays reach the 140 km limit; completeness beyond that limit is not claimed.
The initial 90 km investigation was extended after the outer-ring audit found visible
terrain around Mount Baker, approximately 112–115 km away. An elevated overview can expose
the selected layer's outer edges. North Shore close-up
flight and all possible high-altitude horizons remain outside this beach-horizon LOD phase.

## Curvature and water

At 10, 30 and 90 km, geometric curvature drop is approximately 7.8, 70.6 and 635.7 m.
Its angular effect becomes material around 10 km (about 0.045°). With 140 km terrain,
curvature is enabled continuously using `d² / (2 × 6371008.8)` relative to the active
observer's horizontal position. There is no discontinuous distance threshold.

The same vertex displacement applies to coastal terrain, regional terrain and water.
Camera and source elevations retain the existing datum; the tangent plane follows the
observer. Blender implements the same operation with an active-camera geometry-node group.
Its water absorption volume shares the ocean's subdivided curved top and stays 0.025 m
below the surface through tide changes. Web terrain, water, sky and crowd shaders share
logarithmic depth encoding to retain precision over the extended clipping range.
This is a local small-angle approximation, not a globe engine. Over the configured range,
the higher-order spherical drop correction is only centimetres. Horizon azimuth is clockwise
from projected grid north, matching the existing runtime's orientation convention.

## Materials, snow and lighting

The regional shader uses muted forest colour, height/slope rock transitions and configurable
snow. It has no texture allocation and no tree instances. Snow line, amount and transition
width live in `config/regional.json`; runtime `setMountainSnow` supports future environmental
inputs. Snow controls in the performance inspector are manual visual settings, not current
snow observations. Blender stores matching scene controls.

The real Phase 3 solar uniforms light terrain normals at runtime; no lighting is baked.
The shared haze function reduces contrast and saturation toward the same atmospheric colour
as the coast. Rain and weather visibility change that function globally, and night reduces
sun and ambient light. This remains the existing directional-light approximation: regional
cast-shadow maps and volumetric mountain clouds are not introduced.

## Inspection and acceptance artifacts

Open `/coast?beach=spanish-banks&profile` and expand **Performance**. Terrain debug provides
source, LOD, distance-band, bounds, skyline, rays and visibility modes. **Terrain viewpoint**
and **Inspect terrain viewpoint** use the exact analyzed cameras. Green visibility markers
are samples exceeding all nearer elevations along the ray; red markers are occluded.
The skyline is a debug line over actual meshes, never a production backdrop.

The shared app destination list currently has no Wreck Beach record. Its additional terrain
viewpoint uses the Phase 1 BC gazetteer reference and the nearest measured low ground
within 400 m, plus the same 5 m camera clearance as other beach views. It is available in
the inspector and Blender without adding an invented app beach listing. Locarno is also
included, so there are nine reference profiles.

Generated products under the current `data/processed/<world-hash>/regional/` include:

- `horizons.svg` and `horizons.json`: all reference profiles, distance, raw elevation,
  apparent angle, nearer-terrain occlusion counts and representative visibility rays.
- `selection.json`: selected projected tiles, survey coverage and selection passes.
- `regional.json`: exact tile meshes, source coverage, budgets and both LOD comparisons.
- `data/metadata/latest-regional-export.json`: actual triangles, bytes, textures and
  maximum regional draw calls. The export fails if a budget is exceeded.

`client/e2e/regional.spec.ts` navigates the representative beaches, checks successful regional
loading and distinct camera positions, visits Wreck, and captures screenshots. The standalone
`node client/scripts/profile-regional.mjs` browser profiling script records environment changes and timing separately from
offline numerical checks. Emulated mobile/software rendering is not a physical-device result.

See [NOTICE.md](NOTICE.md) for attribution and the Open Government Licence – Canada.

## Measured release validation

The September 19, 2026 build for coastal world `a87b3515abca` selected 417 source tiles;
414 contain exported terrain after the coastal cutout. These form 183 streaming groups
per LOD. No selected source samples remain unknown.

| Regional asset metric | Measured | Budget |
| --- | ---: | ---: |
| Coarse triangles, including shoreline closures | 241,477 | 280,000 |
| Detail triangles, including shoreline closures | 419,289 | 500,000 |
| Both LODs, GLB download bytes | 18,803,828 | 30,000,000 |
| Coarse GLB download bytes | 7,259,588 | Included above |
| Texture allocation | 0 | 0 |
| Maximum regional draw calls, one LOD per group | 183 | 200 |

Every reference beach passes the 0.06° sampled horizon tolerance. Maximum error is
0.032° for coarse geometry and 0.013° for detail. HRDEM supplies approximately 42% of
the selected North Shore diagnostic window; MRDEM supplies the remainder. Source fractions
and contributing azimuths for each named region are recorded in
`data/metadata/latest-regional-validation.json`. Across 18,167 dry-ground overlap samples,
the regional-minus-coastal median is −0.068 m and the 95th percentile absolute difference
is 2.037 m. This measures agreement between resampled surfaces, not datum accuracy.

The saved detailed and overview Blender worlds each contain 414 regional objects and
nine cameras. Reopening them verifies active-camera curvature to within 0.00014 m and
water/volume alignment at three tides. Reproduce that check with:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.4/blender.exe' --background 3d/output/vancouver_coast_overview.blend --python 3d/blender/verify_regional.py -- --render
```

The final browser profile uses Chromium SwiftShader software rendering at 1440×960 and
Pixel 5 emulation. Desktop samples range from 12–22 FPS; the existing low-detail fallback
now also reduces canvas render scale, reaching 0.5 under sustained load. Mobile samples
are 31 FPS at scale 1, using coarse regional geometry. These are software-renderer results,
not hardware/mobile-device performance claims. The profile records 5–45 resident regional
groups, weather and solar changes, and no browser errors. Residency includes cached groups;
it is not a count of draw calls in the current view. The numerical asset budgets pass,
but physical-device performance remains unmeasured.

Validation passed 341 client unit tests, 32 GIS/export tests, four desktop/mobile regional
and crowd browser tests, and the production client build. `coast:package` verified all
1,496 combined coastal/regional GLBs and generated `output/coast-web.tar.gz`. Review images,
including all required beach views, rain, morning, sunset, night and Blender, are in
`output/regional-review/`; `profile.json` contains the associated measurements.
