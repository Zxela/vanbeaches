# Vancouver coastal world — GIS, Blender and web assets

Phase 5 extends this world with measured regional terrain, adaptive mountain LODs and beach
horizon diagnostics. See [REGIONAL.md](REGIONAL.md) for acquisition, Blender/web integration,
curvature, snow, performance budgets and validation.
Phase 6 adds [tide-dependent coastal topology](COASTAL-TOPOLOGY.md) and
[urban context](URBAN.md): dated City 2009 building massing, sourced bridge alignment,
roads and terrain-following park coverage. Phase 7 adds [simulated harbour movement](PHASE7-SOURCES.md).
See [PRODUCTION.md](PRODUCTION.md) for integrated quality tiers, provenance, release operations
and the acceptance workflow. Browser acceptance for the integrated world is assessed separately
from the historical measurements below.

A reproducible, metre-scale GIS → Blender pipeline within the existing Van Beaches repository.
It builds measured terrain geometry, a separate tide-driven ocean, depth bands, urban context
and source diagnostics. Blender and web exports share that geography. GIS processing stays offline;
the web runtime streams generated assets and integrates environmental data separately.

**Current result: all 78 required City LiDAR ZIPs and eight NONNA WCS chunks have been processed.**
The regenerated `output/vancouver_coast.blend` covers Wreck → Point Grey → Spanish Banks → Jericho
→ Kitsilano, English Bay and Stanley Park as one tiled coastal world. All eight existing coastal
destinations now have measured elevations. Tide, natural/depth/provenance modes and inspection
cameras work in the saved file. Numerical acceptance passes with documented source warnings.

Downloading every file does not mean every location was surveyed. Genuine hydrographic gaps and
areas without bare-earth returns remain visible. High land-side NONNA samples are retained in
diagnostic rasters but excluded from seabed candidates. No replacement geography has been invented.
The gap audit identifies 29 remaining gaps of at least 10,000m²; 93.7% of the configured AOI's
10m nodes have measured or explicitly interpolated elevations. This includes inland bare-earth
holes and marine gaps, not just beach coverage. Spanish Banks' test disk has about 98.2% coverage.
Independent Metro 2022 dry-ground measurements add 1.41km² of coverage without replacing primary
samples. Total unknown area decreases by about 17%; some formerly connected gaps split into smaller
components, so component count alone does not measure improvement. 20,767 steep mixed-source
connecting faces are excluded from the detailed scene and retained in Debug.

## Repository integration

The existing application is a pnpm 9 workspace with React 19, TypeScript, Vite, Tailwind and Leaflet
in `client/`; shared types and authoritative beach records in `shared/`; a scheduled Cloudflare
Worker in `worker/`; and Pages Functions in `functions/`. Weather comes from Open-Meteo and tides
from IWLS. Existing beach records use a shared station ID; this offline model's approximate vertical
conversion uses Vancouver station 07735 independently of those live integrations.

Vite public assets are in `client/public/`, builds in `client/dist/`. The exporter writes the
generated world to `client/public/coast-assets/`; deployment restores a verified, versioned asset
bundle instead of regenerating GIS or invoking Blender. Photography conventions use beach IDs
and external R2 derivatives. Biome excludes `3d/`; Python uses Ruff, pytest, and a separate
path-filtered workflow. See [WEB.md](WEB.md) and [PRODUCTION.md](PRODUCTION.md).

## Architecture and files

```text
config/world.yaml           AOI, origin, datums, spacing, water bands and test states
gis/acquire.py              official tile discovery, WCS requests, cached atomic downloads
gis/preprocess.py           streamed LAS ground grids and normalized bathymetry
gis/build_coast.py          conservative fusion, masks, meshes, tiles and LOD seams
gis/beaches.py              read existing TypeScript beach literals; fail on schema drift
gis/audit.py                mapped survey gaps, source-file evidence and regional comparisons
gis/imagery.py              licensed City aerial tiles → georeferenced bounded textures
gis/supplements.py          independent Metro LiDAR, overlap gate and measured gap coverage
gis/validate_data.py        orientation, geometry, coverage, seams and tide-area diagnostics
gis/urban.py                cached City/OSM buildings, roads, bridges and draped land cover
gis/marine.py               tide-dependent connection to surveyed ocean water
blender/build_scene.py      headless bpy entry point; no GIS dependencies
blender/urban.py            merged source-derived building and infrastructure geometry
blender/moving.py           simulated entities with tide-aware route visibility
blender/finalize_world.py   refresh native cameras/tide bindings and verify existing scenes
blender/verify_scene.py     reopen .blend, verify tides/LOD, render inspections and record timings
data/metadata/              small reproducibility / acquisition reports, version controlled
data/raw/                  ignored official downloads and source sidecars
data/cache/                ignored API responses and reusable classified ground grids
data/processed/<hash>/     ignored rasters, masks, NPZ tiles, manifest and validation
output/                    ignored .blend, renders and build report
```

Pipeline: official point clouds / bathymetry → GIS rasters → tiled local meshes → Blender.
Blender only needs its bundled Python, NumPy and `bpy`. It never opens a LAS or GeoTIFF.
No PDAL/GDAL command-line installation is needed: laspy streams LAS, rasterio wheels bundle GDAL,
pyproj handles horizontal coordinates, and SciPy handles limited interpolation.

An independent [Metro Vancouver 2022 bare-earth survey](https://www.arcgis.com/home/item.html?id=d510200c39294832aa7dffab716adfa2)
supplements locations missing both primary sources. It is published under the
[Metro Vancouver Open Government Licence](https://open-data-portal-metrovancouver.hub.arcgis.com/pages/Open%20Government%20Licence),
with EPSG:3157 horizontal coordinates and CGVD28GVRD2018 heights. The archive is 4.67GB and 53
LAS members intersect this AOI. The adapter checks class 2 and withheld flags, clips to the AOI,
and caches prepared ground grids per member. It does not overwrite City or NONNA measurements.
Although supplied as bare earth, the archive contains near-level classified returns over deep
NONNA water. Consequently only **dry-ground elevations above the highest test tide plus 0.5m**
are eligible to fill gaps. The full `metro-ground-full-*m.tif` diagnostic rasters retain every
classified sample; `metro-ground-*m.tif` contains eligible candidates. No aerial water return is
silently interpreted as bathymetry. Purple provenance identifies actual supplementary measurements.
The configured zero vertical offset is a nominal local-datum approximation, checked against City
overlap: median Metro-minus-City **+0.018m**, 95th percentile absolute difference **0.398m** across
440,562 10m nodes. These statistics are agreement checks, not positional accuracy certification.
If the configured median/P95 limits fail, supplemental measurements are retained for diagnosis
but excluded from the coast. Metadata, exact archive members, hashes and acceptance results are
in `metro-2022-source.json` and `latest-supplemental-ground.json`.

## Required software and setup

Tested with **Python 3.12.10**, **Blender 4.4.3**, Windows PowerShell. Use Blender 4.4 for the
current shader/animation APIs. The numerical suite also runs independently on Linux CI.
`requirements.lock.txt` pins the tested Python environment including transitive dependencies.

From the repository root, Windows:

```powershell
python -m venv 3d/.venv
& 3d/.venv/Scripts/python.exe -m pip install -r 3d/requirements.lock.txt
& 3d/.venv/Scripts/python.exe 3d/pipeline.py --help
```

Linux/macOS:

```sh
python3.12 -m venv 3d/.venv
3d/.venv/bin/python -m pip install -r 3d/requirements.lock.txt
```

Activate that environment to use the shorter `python` commands below. If Blender is not on PATH,
set `BLENDER` or pass `--blender "C:/Program Files/Blender Foundation/Blender 4.4/blender.exe"`.
The launcher also searches the usual Windows Blender Foundation install directory.
Blender subprocesses default to four worker threads; use `--threads 4` explicitly in shared
workflows. Run one heavyweight GIS, Blender or software-rendered browser job at a time.

## Sources, references and attribution

* **City of Vancouver, [LiDAR 2022](https://opendata.vancouver.ca/explore/dataset/lidar-2022/)**:
  classified LAS, September 7/9 2022 acquisition, approximately 49 points/m², reported vertical
  accuracy 0.081 m at 95% confidence. Bare-earth / low-grass class 2 is retained; withheld points
  are excluded. City/UBC coverage is survey coverage, not the bounding box of every available tile.
  Contains information licensed under the
  [Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/).
* **Canadian Hydrographic Service, [NONNA catalogue](https://open.canada.ca/data/en/dataset/d3881c4c-650d-4070-bf9b-1e00aabf0a1d?res_page=1)**:
  NONNA-10 nominal ~10 m bathymetry, numeric float GeoTIFF via the linked official WCS. The
  [NONNA FAQ](https://api-proxy.edh-cde.dfo-mpo.gc.ca/catalogue/records/d3881c4c-650d-4070-bf9b-1e00aabf0a1d/attachments/CHS_NONNA_Data_Portal_FAQ_en.pdf)
  identifies Chart Datum and explains gaps and survey metadata. WCS supplies a mosaic, so
  the requests are geographic chunks, **not invented NONNA catalogue cell IDs**.
* The **[CHS NONNA Licence](https://api-proxy.edh-cde.dfo-mpo.gc.ca/catalogue/records/d3881c4c-650d-4070-bf9b-1e00aabf0a1d/attachments/CHS_NONNA_LICENCE-LICENCE_NONNA_DU_SHC.pdf)**
  applies to CHS data, separately from this repository's code licence. See [NOTICE.md](NOTICE.md).
  Its derivative-product notice is embedded in the generated `.blend` text data.
* **[Vancouver tide station 07735](https://tides.gc.ca/en/stations/07735)** publishes CGVD28 −3.00 m
  and CGVD2013 −2.88 m offsets; only the requested approximate CGVD28 conversion is used.

**NONNA is non-navigational. This model is not for navigation, surveying, engineering, or flood-risk
decisions.** It is not an official CHS product. Preserve the notice with future exported derivatives.
The City CSRS realization and CGVD28GVRD space, and a spatially varying hydrographic datum, are not
rigorously reconciled by a single station offset. The source accuracy does not describe the accuracy
of the joined model. WCS does not expose per-survey vertical metadata; that uncertainty is recorded
in each source sidecar. A survey-specific correction surface remains future work.

## Discover and download

```sh
python 3d/pipeline.py discover
python 3d/pipeline.py data
```

`discover` queries the entire paginated City index and intersects actual tile polygons with the AOI.
It saves `data/metadata/required-sources.json`: exact City IDs, URLs and expected paths, plus exact
NONNA WCS URLs, request extents and native service resolution. It also checks City metadata and
WCS DescribeCoverage, rather than guessing layer names or treating a rendered map as elevation.

Downloads use temporary files, completion checks, SHA-256 receipts and a three-worker limit.
Completed files are reused without requests. `--refresh` explicitly refetches. To update an upstream
version, refresh deliberately and retain the old receipts if comparing results. Classified ground
grids are cached by source hash, bounds, spacing, CRS and ground classification. Water/material
changes do not invalidate LAS extraction. Rerunning processing regenerates derived rasters
and manifests; it never silently replaces missing geography.

Download one source independently:

```sh
python 3d/pipeline.py data --source bathymetry
python 3d/pipeline.py data --source lidar
```

### Manual City downloads and future resume

All 78 required archives are now present. Most were downloaded in a browser and imported after
the automated host returned Cloudflare HTTP 403. Exact paths and official URLs are in
[required-sources.json](data/metadata/required-sources.json), with ready statuses and checksums in
the acquisition reports. For example, place the unchanged official `481000_5456000.zip` at
`3d/data/raw/lidar/481000_5456000.zip`. **Keep each official ZIP zipped**; the LAS reader streams
its content. Each expected ZIP contains one LAS/LAZ cloud (auxiliary LASX files are ignored).

To list only missing required downloads in PowerShell:

```powershell
$coastSources = Get-Content 3d/data/metadata/required-sources.json -Raw | ConvertFrom-Json
$coastSources.lidar | Where-Object { -not (Test-Path (Join-Path 3d $_.path)) } |
  Select-Object id, url, path | Format-Table -Wrap
```

Obtain those exact files from their listed City links on a connection where the host permits the
downloads, place them at the listed paths, then rerun `data --source lidar`. Local files are adopted
with receipts and checked as ZIPs; no manual code edits are needed. Acquisition failure is recorded
per file and does not prevent attempts on the other source. No screenshots or procedural coast
stand in for inaccessible data.

### If NONNA WCS later becomes unavailable

The manifest lists complete executable GetCoverage URLs and expected local TIFF paths. Fetch those
URLs manually where possible. For an alternative official NONNA GeoTIFF, use the
[CHS portal](https://data.chs-shc.ca/map) to select the same request footprint, retaining nodata,
CRS and survey metadata. Supply a sibling `NAME.source.json` containing at least `sha256`,
`dataset`, `vertical_datum`, `value_convention`, `nominal_resolution_m`, and source URL/evidence.
Use `Chart Datum` only if verified and choose `depth_positive_down` or `elevation_positive_up` from
the actual product. Then run `process`; do not run `data` to relabel an alternative product.
Unknown datums are rejected. The WCS adapter does not automatically ingest BAG/CSAR/XYZ.

## Process and generate Blender

```sh
python 3d/pipeline.py process
python 3d/pipeline.py imagery
python 3d/pipeline.py blender --render
# A separate lightweight world from the already-generated 10m products:
python 3d/pipeline.py blender --lod overview --render
# All stages, stopping if required sources are missing:
python 3d/pipeline.py world --render
```

Optional Make equivalents are isolated too: `make -C 3d 3d-data`, `3d-process`, `3d-blender`,
`3d-overview`, `3d-world` with the activated Python environment (or `PYTHON=/absolute/path/to/python`).

`data`/`world` download the enabled Metro archive as well as primary sources. For an existing
primary cache, `python 3d/pipeline.py data --source supplemental` acquires only the supplementary
archive. Put a manually downloaded `Vancouver.zip` in `3d/data/raw/metro-2022/` and run that command
to adopt and fingerprint it. `sources.supplemental_ground.enabled: false` reproduces the primary-only
model; run `discover` again after configuration changes. The older City 2013 GeoTIFFs were also
investigated, but all 65 AOI requests returned HTTP 403 here; `supplementary-city-2013.json` records
their exact URLs/paths. Those older products are **not incorporated** or treated as verified terrain.

For an intentionally incomplete source set, the explicit inspection workflow is:

```sh
python 3d/pipeline.py data --allow-partial
python 3d/pipeline.py process --allow-partial
python 3d/pipeline.py blender --allow-partial --render
```

Output: **`3d/output/vancouver_coast.blend`** plus `overview.png` and `build-report.json`.
The overview command writes **`3d/output/vancouver_coast_overview.blend`** and reports/images with
an `_overview` suffix; it never overwrites the detailed world. Both have the same geographic scope,
source/datum policy, tide controls and materials. The overview uses 10m land geometry for navigation;
open the detailed world for 2m coastal land. Bathymetric source resolution is unchanged.
`world` also prepares imagery when `imagery.enabled` is true. After rerunning `process`, rerun
`imagery` before `blender` to attach it to the newly generated manifest. Imagery is cached separately
and never changes terrain heights. Missing image tiles leave procedural materials visible.
The partial scene defaults to Depth mode to expose the holes, includes an incomplete-source marker,
and records missing files in its embedded metadata. Without `--allow-partial`, missing sources stop
the processing and scene-build stages. Delete the `.blend` and run `blender` to recreate it from
the GIS products. Delete processed files and run `process` to recreate them from cached raw inputs.

## Geographic bounds and coordinates

`config/world.yaml` is the geographic/data configuration source. Use `--config path/to/other.yaml` to extend
the world. Current bounds: west −123.28, east −123.10, south 49.245, north 49.32. They contain all
eight existing coastal beach destinations, UBC/Point Grey, and Stanley Park, while Trout Lake lies
east of them. The [BC gazetteer Wreck Beach reference](https://apps.gov.bc.ca/pub/bcgnws/names/35001.html)
also lies inside. The web regional export adds a Wreck Beach inspection destination using its
existing measured regional observer. The coastal footprint excludes the North Shore mountains
and parts of False Creek; the independent regional DEM layer supplies measured mountain geography.

Horizontal working CRS: **EPSG:3157, NAD83(CSRS) / UTM zone 10N**. The downloaded LAS header
advertises EPSG:26910 (generic NAD83); the adapter explicitly interprets its metre coordinates
according to the City's more specific collection metadata, recording both and the reason. Any
unexpected LAS CRS is rejected. It does not claim a precise realization/epoch transformation.

The origin at longitude −123.19, latitude 49.28 projects to approximately
**E 486182.109224 m, N 5458599.544352 m**. The manifest stores the computed values at full precision.

```text
local X = easting − origin easting
local Y = northing − origin northing
local Z = CGVD28GVRD-space elevation (no vertical exaggeration)
1 Blender unit = 1 metre
```

`World.local()` and `World.geographic()` implement both directions with `always_xy=True`.
Tile geometry uses small local offsets and object transforms, never huge absolute UTM vertices.
The processing rectangle is aligned to 500 m tiles; data are clipped to the geographic AOI.
Raster pixel centres are mesh nodes, consistently anchored at both 10 m and 2 m spacing.

`beaches.json` derives IDs, names, slugs and coordinates from `shared/src/data/beaches.ts` at build
time, with the source hash. Missing elevations are JSON `null`, never invented beach heights.
The regional export additionally supplies the measured Wreck Beach inspection destination without
changing the shared dashboard beach database. Tower/Acadia have no separate destination records.
Destinations do not clip geometry.

## Vertical normalization and source resolution

`vertical.chart_datum_offset_m` is −3.0. Land Z is preserved. For positive-down depths:
`Z = -depth + offset`; for signed elevations above CD: `Z = elevation + offset`.
The **actual NONNA WCS float band is signed elevation**, checked against negative values in English
Bay and positive drying heights at Spanish Banks. It must not be inverted as though it were the
positive-down XYZ convention described elsewhere in CHS documentation.

Water Z is always `tide_height_cd + offset`: tide 3.0 → Z 0; tide 0.5 → Z −2.5.
Per-file source metadata and normalized raster tags retain the convention and relationship.

Ground points are averaged into 2 m and 10 m nodal grids. Only class 2, non-withheld points count.
Three archives are streamed concurrently. The 10 m overview can be derived from point-count-weighted
2 m means: the odd 5:1 ratio aligns grid-cell boundaries and preserves the contributing ground-point
population. Float32 rounding is retained; this does not add accuracy. Cache writes are atomic and
corrupt caches are regenerated. Older directly extracted 10 m caches remain usable.
Nominal source density and actual retained class counts remain in provenance. NONNA geometry uses
a 10 m working grid; the service's reported Web Mercator grid is ~19.1 map metres, approximately
12.5 m on the ground here. Requests/resampling cannot create finer survey accuracy. The metadata
retains both the nominal product resolution and native WCS spacing.

Every 500 m tile gets an overview product. Tiles within 250 m of measured low-elevation land get
a 2 m coastal LOD; this is an elevation-derived candidate shoreline band, not a supplied surveyed
shoreline. It can include low inland terrain. Coastal boundaries follow the common coarse polyline
to prevent visible cracks; adjusted edge nodes and mixed-source faces are marked orange. This is
a geometric T-junction scheme; a future watertight export should retriangulate shared boundaries.
Hero-area processing is not enabled. Lowering a grid size never changes native source accuracy.

## Joining the surfaces and gaps

Measured City LiDAR takes precedence where sources overlap; NONNA follows, then eligible Metro
dry-ground measurements only where both primary sources are missing. Overlap discrepancies are reported.
NONNA fills locations without LiDAR. No measured heights are silently nudged to hide disagreement.
Only NONNA samples at or below the maximum configured tide-test height are seabed candidates
(currently 5 m CD, approximately +2 m world Z). This prevents high terrestrial returns in the
hydrographic mosaic from creating spikes in gaps in the bare-earth DEM. All normalized samples
remain in `nonna-normalized.tif`; exclusions remain in `nonna-above-tide-range.tif`, with counts and
the cutoff recorded in processing metadata. Higher ground comes from City LiDAR. Increase the
configured tide-test range and reprocess if studying higher water levels.
Only fully bounded holes within configured area, distance and slope limits are linearly interpolated
from their measured boundary. Large or open gaps remain holes. That conservative policy can leave
long intertidal survey gaps unresolved; it is preferable to inventing an unmeasured continuous shelf.

`coast.tif` and `provenance.tif` accompany all meshes. Mask codes: 0 missing, 1 City LiDAR, 2 NONNA,
3 interpolated, 4 Metro 2022 LiDAR. Blender's orange face classification also includes mixed-source triangles and LOD
edge resampling, a conservative visualization of derived geometry. Cells with missing corners do
not generate triangles. Land, seabed and derived transition faces live in separate collections.
Accepted drying elevations retain their values and NONNA provenance; excluded high samples are
available for GIS inspection and never relabelled City LiDAR.

Mesh edges directly connecting different measured sources must pass two configured limits:
`max_source_join_step_m` (2m) and `max_source_join_slope` (0.5m/m). If **both** are exceeded,
incident triangles are excluded from the visible surface and saved as `rejected_source_joins` in
the tile NPZ. This prevents an unsupported curtain of geometry between conflicting measurements.
Same-source cliffs and all measured elevations are preserved. This policy leaves a visible opening
instead of claiming surveyed continuity; it does not resolve piers or adjust either source's datum.

Validation also writes `coverage-gaps.geojson` (WGS84 polygons), `source-review.json`, and a tracked
`data/metadata/latest-source-review.json`. The report counts missing nodes **inside the AOI**,
excluding rectangular grid padding. Gaps of at least `validation.gap_report_min_area_m2` have
projected/geographic bounds, nearest existing destination, intersecting local source files, and
counts distinguishing raw NONNA nodata from above-tide exclusions. These are grid-footprint
estimates, not surveyed shoreline polygons. Per-destination overlap statistics help distinguish
local structural disagreement from a general vertical shift. The official
[NONNA catalogue](https://open.canada.ca/data/en/dataset/d3881c4c-650d-4070-bf9b-1e00aabf0a1d)
also documents reasons for missing coverage. Larger remaining gaps require additional authoritative
measurements; changing the interpolation limits to hide them is not a data-quality fix.

## Using the Blender world

Open the `.blend`, then select **Ocean → Object Properties → Custom Properties**:

* `tide_height_cd`: set 0.5, 1.5, 3.0, 4.5 or 5.0. A persistent native Blender driver moves Z.
* `display_mode`: **0 Natural**, **1 Depth**, **2 Provenance**.
* `aerial_imagery`: **0 procedural land**, **1 real City 2022 aerial photography**, or a blend.
* `wave_amplitude_m`, `wave_direction_degrees`, `wave_speed`, `wind_strength`, `water_colour`:
  independent manual parameters. Waves currently perturb normals, not the tide plane geometry.

Depth means water surface Z minus surface terrain Z. Bands are configured at 2, 5, 10 and 20 m;
greater depths use deep blue. Exposed ground retains land material. In Depth/Provenance modes
the water shader becomes transparent so the actual seafloor remains visible. In Natural mode it
uses Fresnel/transmission, two scales of animated wave normals, and a closed optical absorption
volume beneath the surface. The volume is offset 2.5cm below the surface to avoid coincident-ray
artifacts; its bottom is an optical bound, never claimed as measured seabed. Depth/Provenance
modes disable absorption. Sand has continuous tide-relative wetness, sediment colour variation,
and small procedural normal details. These details change appearance, never measured elevations.
There is no fluid simulation, breaking surf, wave displacement, or remembered wetting/drying history.

The tide action `TideTests` is saved but unassigned so it never overrides manual tide editing.
Assign it to Ocean in the Action Editor to animate its five test states, with `play_tide_demo` off.
Core collections: `WORLD/{Terrain,Seabed,Shoreline,Water,Environment,Lighting,Cameras,Debug}`.
Regional terrain, `Urban`, and simulated movement collections add independent geometry.
Mountains use measured DEMs; buildings use City 2009 footprints/heights; land cover and bridge
alignment come from OSM. Unknown terrain remains unknown. All vessel/aircraft/traffic movement
is simulated, and the SeaBus route is suppressed when its surveyed marine corridor fails validation.
The same marine-connectivity mask gates native ocean surface and volume; see
[COASTAL-TOPOLOGY.md](COASTAL-TOPOLOGY.md) and [PHASE7-SOURCES.md](PHASE7-SOURCES.md).

Land appearance uses [City 2022 orthophotos](https://opendata.vancouver.ca/explore/dataset/orthophoto-imagery-2022/)
through the City's export-enabled ArcGIS tile service. The original imagery is 7.5cm; level 16
service pixels are approximately 1.56m locally and output textures are 256×256 over 500m (~1.95m).
These are deliberately bounded textures, packed into the `.blend`, with acquisition hashes and
licensing in `required-imagery.json` and `latest-imagery.json`. Image alpha preserves missing
coverage. They show photographed roofs/trees/roads on the ground mesh, not reconstructed buildings.
Imagery fades in only **above the maximum configured tide-test elevation plus a margin**, so its
photographed waterline cannot substitute for tide-driven intertidal materials. Underwater depths
remain entirely NONNA geometry. Provenance mode overrides photographs. Tile-local metre mapping
preserves orientation without a large per-loop UV allocation; web export bakes it to UVs.
Google imagery/3D tiles are not copied into offline assets; see Google's
[storage policy](https://developers.google.com/maps/documentation/tile/policies).

Use Material Preview or Rendered mode for shaders. Hide Water to inspect geometry. `Z → Wireframe`
shows topology. Enable `Debug/Tile boundaries`, `Debug/Destinations` and `Debug/Source disagreements`
as needed; they start hidden. Disagreement lines connect the two measured elevations at the largest
overlap conflicts; their properties include coordinates and both source heights.
`Debug/Survey gaps` adds bounds with source-file evidence; `Debug/Rejected source joins` shows
the excluded connecting faces as wireframes. Both are hidden from normal viewing and renders.
The detailed scene opens in fast Solid shading; press `Z → Material Preview` to see water modes.
The lighter overview scene starts in Material Preview using the scene's sky and lighting.
No automatic Python execution is needed.
The origin axes and object custom properties expose local/geographic coordinates and provenance.
Overview, coastal flyby, beach-level, north-up survey and Spanish Banks tide-study cameras are
included. The flyby has location keyframes.
The Point Grey-to-Kitsilano camera gives a closer coastal composition. The beach-level camera is
placed on a nearby measured dry-ground patch, above the local fine-grid maximum; the canonical
destination record remains unchanged.
Blender's normal orbit controls and Shift+accent-grave fly navigation work at metre scale.
The embedded `START HERE` and `world-metadata.json` text blocks retain controls and source status.

### Fly into the shore and watch the tide rise

Every complete-source Blender build now also writes **`vancouver_coast_shore_experience.blend`** (or
**`vancouver_coast_overview_shore_experience.blend`** for the lighter LOD). Open it and press
**Space** in the viewport. It starts in Material Preview and plays a 20-second sequence:

1. Fly from about 900m altitude toward the existing Spanish Banks destination.
2. Settle 1.75m above a nearby prepared beach surface after eight seconds.
3. Hold that view while the tide rises from 0.5 to 5m CD, then hold at high tide.

The tide is deliberately accelerated, not a forecast or a claim about the real rate of rise.
The camera and tide have independent native animation. All 480 integer frames are checked
against the actual chosen LOD triangles for ground clearance; this route currently crosses no
unknown ground. `shore-experience-validation*.json` records the complete path and clearances.
These checks cover the guided route; manual Blender fly navigation remains unrestricted.
The beach lookout is offset from the shared destination's measured camera anchor; it does not
change the app's beach coordinates. Wave-normal speed is in metres per second and is independent
of the accelerated tide timing. The main `.blend` still opens with **manual** tide control.

For optional convenient controls, change an editor to **Text Editor**, select the embedded
**Coast controls.py — optional sidebar**, and choose **Run Script**. Return to the 3D viewport,
press **N**, and open **Coast**. It provides tide presets, the manual height slider, display modes,
cameras, replay, and **Fly from here**, which copies the current view to an unanimated camera.
Use **Shift + accent grave (`)** to enter Blender fly navigation. The tide can continue playing
while that camera moves freely. The sidebar must be run again after reopening; native drivers,
custom properties and the saved demonstration work without executing this optional script.

Presentation is separately configured in **`config/presentation.json`**: sand colours/relief,
water optics, lighting, camera eye height, animation timing and review resolution. Changing
these settings requires only `python 3d/pipeline.py blender`; it does not invalidate the GIS cache.
The selected presentation configuration is embedded alongside world metadata in each scene.

```sh
python 3d/pipeline.py blender             # Rebuild detailed manual + demonstration files
python 3d/pipeline.py blender --lod overview
python 3d/pipeline.py preview --stills    # Five rendered checkpoints
python 3d/pipeline.py preview             # 20-second MP4 review, sampling at 12fps
python 3d/pipeline.py preview --step 1    # Render every frame at 24fps
```

For existing generated scenes, refresh the independent data and native presentation sequentially:

```sh
python 3d/pipeline.py urban
python 3d/pipeline.py marine
python 3d/pipeline.py export --threads 4
python 3d/pipeline.py finalize --threads 4
```

`finalize` reopens the detailed, overview and both shore-experience `.blend` files, updates
native beach cameras and evaluated tide bindings, verifies the required layers and saves them.
It reuses existing geometry and does not regenerate terrain. Run normal `blender` builds first
if the saved files do not yet contain the current urban/moving layers; finalization does not
replace geometry acquisition or scene construction.

`make -C 3d 3d-preview` runs the default review. The preview uses Cycles, an available NVIDIA
OptiX device or CPU, and persistent geometry. FFmpeg on PATH encodes `output/shore-experience.mp4`;
without it the rendered PNG sequence and an encoding note are retained. `--lod overview` selects
the lighter scene and separately named outputs. Interrupted rendering resumes from matching
frames in a scene-specific cache directory, so an older render cannot silently replace new frames.
The movie is an offline visual review, not a web export or interactive performance measurement.

Close views still expose the limits of a 2m bare-earth/approximately 10m bathymetric model:
some shoreline facets, sparse structural/vegetation detail, and actual missing survey regions.
Procedural sand texture adds visual scale but cannot create surveyed sub-metre beach geometry.
North Shore mountain geometry comes from the independent measured regional DEM layer,
rather than extending the coastal survey's accuracy or filling its unknown areas.

## Validation and current limitations

```sh
python -m pytest -c 3d/pyproject.toml 3d/tests
python -m ruff check 3d
python -m ruff format --check 3d
python 3d/pipeline.py validate
blender --background 3d/output/vancouver_coast.blend --python-exit-code 1 --python 3d/blender/verify_scene.py -- --render
# Check the lightweight saved scene too:
blender --background 3d/output/vancouver_coast_overview.blend --python-exit-code 1 --python 3d/blender/verify_scene.py
```

`validate` returns exit 0 when numerical acceptance passes, 2 for incomplete acceptance, or 3 for
structural failure. Source warnings remain in the report and do not become claims of survey accuracy.
`process --allow-partial` permits structurally valid inspection products with missing source files.
Reports are in `data/metadata/latest-validation.json` and the matching processed directory.
The numerical tests use tiny synthetic fixtures to test algorithms, **never as model geography**.

The current real run passed orientation order, coordinate roundtrips, upward triangle normals,
indices/budgets, provenance consistency, plausible elevation range and all five Blender tide-driver
states. The saved `.blend` was reopened and rendered in Natural, Depth low/high and Provenance modes.
Available data support increasing submerged area near Spanish Banks: about 0.292 km² at 0.5 m CD
and about 1.815 km² at 5 m CD within the configured 1.2 km test radius. Approximately 98% of that
disk has measured or explicitly interpolated terrain. Northward transects derived from the existing
Spanish Banks destination show roughly 947–984 m of shoreline movement between those tide states
where the entire profile has coverage. Transects crossing missing samples report no distance rather
than extrapolating. See the report for all five states and individual transect measurements.
The City's [roughly 1 km low-tide observation](https://vancouver.ca/parks-recreation-culture/spanish-bank-beach.aspx)
is a reference, not a target imposed on geometry.

After excluding above-tide NONNA candidates, 1,104 overlap nodes differ by more than 2 m. The
largest remaining differences are around eastern harbour structures: land/deck elevations near
+4 m and hydrographic elevations around −23 m can occupy the same XY location. A single heightfield
cannot represent seabed beneath a pier deck. These differences are not treated as evidence for a
global datum adjustment. Coordinate samples remain in the report and Blender debug collection;
the maximum detected source-boundary step, including supplemental ground, is about 33.8 m. A rigorous per-survey datum correction,
separate elevated structures, and resolution of actual survey gaps remain future refinements.
This step describes the diagnostic raster. Steep direct source-joining mesh faces are now excluded
and available in Debug, so the raster warning is not a claim that an artificial wall was retained.

Bare-earth holes under large buildings and hydrographic holes in Spanish Banks are deliberately
retained when they exceed interpolation limits. This is a visualization foundation with explicit
coverage and datum limitations, not a watertight engineering surface.

## Performance, storage and web export

The full run has 476 active spatial tiles (18,653,797 triangles), plus alternate LOD files.
The generated overview has **2,023,427 triangles**, about **89% fewer** than the detailed scene.
Both cover the same AOI and include the same bounded, packed aerial textures. Exact compressed
file sizes are recorded in the build reports, including texture storage.
The integrated rebuilt files are approximately **66MB overview** and **407MB detailed**;
final saved sizes are recorded in their build/finalization reports. Start with the
overview file for orbit/fly navigation, then use the detailed file for coastal inspection.
Use the separate overview build for less geometry and a smaller file without a runtime decimation
modifier. The build reports record actual triangle counts, saved size and generation time.
Reopening with `verify_scene.py` records five tide updates and optional render times in
`scene-verification*.json`. These headless timings verify responsiveness of the controls; they are
**not viewport FPS measurements**. Interactive GPU performance depends on the machine and shading mode.
LAS is read in million-point chunks with at most three archives active;
2 m land grids use a few hundred MB and caches avoid repeatedly reading large ZIPs. Expect tens
of GB for complete raw LAS archives (this AOI uses 76.16 GB); check available storage. WCS chunks are small. Tile vertex
budgets and subdivision sizes are configuration-checked. Blender loads only the chosen LOD.

Raw/processed/cache/output data and Python environments are ignored by Git. Commit small source
manifests and reports; do not commit LAS, GeoTIFFs or `.blend` files. If persistent products become
necessary, use object storage for source/derived tiles, or deliberate Git LFS for a few curated
Blender artifacts. Neither is introduced now.

Phase 2 now exports these saved worlds into tiled GLBs and integrates an interactive `/coast` view
into Van Beaches. See [WEB.md](WEB.md) for reproducible export, runtime architecture, manual tides,
depth visualization, compression measurements and deployment. Live environmental integration is
documented in [ENVIRONMENT.md](ENVIRONMENT.md), estimated beach activity in
[CROWD_MODEL.md](../CROWD_MODEL.md), and simulated vessels, aircraft and optional bridge traffic in
[PHASE7-SOURCES.md](PHASE7-SOURCES.md). Use [PRODUCTION.md](PRODUCTION.md) for integrated release checks.
