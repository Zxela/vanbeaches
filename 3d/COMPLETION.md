# Phases 6–8 completion record

Completed locally on 2026-09-19. The world and application are built and validated;
no external deployment was performed.

## Phase 6 — coastal topology and city

- Shared marine connectivity in Blender and the browser preserves tide-dependent
  shorelines over measured terrain. Opaque land occludes water; marine absorption,
  depth coloring, wet sand and foam follow the same coverage rules.
- Added 11,927 building footprint parts, a 1,316-building coarse skyline, 2,449 roads,
  four major bridges, 521 land-cover polygons and 894 waterfront features from
  documented City of Vancouver and OpenStreetMap sources.
- Parks follow terrain; city LOD preserves building heights; bridge tower tops use
  the shared world elevation reference. Beach cameras were composed without moving
  geography, including a regional Wreck Beach destination.
- Unknown survey cells may display optical water only where the sourced coastline
  establishes marine affiliation. These cells carry no invented seabed depth and
  cannot authorize vessel navigation. Measured coast elevations and connectivity
  thresholds are unchanged. See `3d/COASTAL-TOPOLOGY.md` and
  `3d/data/metadata/latest-marine-optical-review.json`.

## Phase 7 — living harbour

- Added explicitly labeled SIMULATED ships, local ferries, sailboats, aircraft,
  birds and optional bridge traffic with shared geographic route data and meshes.
- Complete vessel corridors require connected water and surveyed depth, including
  hull clearance. Unsafe routes are suppressed at low tide. SeaBus remains
  suppressed because its route crosses missing depth coverage.
- Blender boats follow both manual tide controls and the accelerated tide demo.
  Each saved scene contains 35 moving entities using eight shared meshes.
- Browser movement respects layer controls, reduced motion and quality budgets.
  LOW disables optional moving entities; MEDIUM and HIGH bound their counts.
- Source and simulation limitations are recorded in `3d/PHASE7-SOURCES.md`.

## Phase 8 — production hardening

- Added bounded LOW/MEDIUM/HIGH quality, adaptive render scale, progressive city
  loading, terrain cache limits, diagnostics and coarse-city failure fallback.
- Added compact beach controls, keyboard-accessible navigation, reduced-motion
  behavior, WebGL/error fallback, and privacy-preserving runtime measurements.
- Corrected crowd budget scaling so higher estimated density remains visually
  distinguishable within a constrained device budget.
- Added canonical beach/tide captures and failure-injection browser checks.
- Added content-derived world identity, asset hash verification, archive packaging
  and CI separation of explicit world generation from ordinary web deployment.
- Regeneration and release instructions: `3d/PRODUCTION.md`, `3d/README.md`,
  `3d/WEB.md`, `3d/URBAN.md` and the root `README.md`.

## Artifacts

Paths below are relative to the repository root.

| Artifact | Path | Size |
| --- | --- | --- |
| Lighter Blender world | `3d/output/vancouver_coast_overview.blend` | 62.8 MiB |
| Lighter shore experience | `3d/output/vancouver_coast_overview_shore_experience.blend` | 62.8 MiB |
| Detailed Blender world | `3d/output/vancouver_coast.blend` | 391.8 MiB |
| Detailed shore experience | `3d/output/vancouver_coast_shore_experience.blend` | 391.8 MiB |
| Native Kits city preview | `3d/output/kits-city-overview.png` | 659 KiB |
| Versioned web asset archive | `3d/output/coast-web.tar.gz` | 64.1 MiB |
| Desktop captures and diagnostics | `3d/output/release-acceptance/` | 35 views |
| Mobile-emulation captures and diagnostics | `3d/output/release-mobile/` | 35 views |

World ID: `world-e14570b34f5918329b77`.

Archive SHA-256:
`fc67cbe6971a3746addcdb8b644e98e386ff801b58623d092856b3208d99538b`.

The package verifies 1,496 terrain tiles and eight supporting assets. The final
client production build includes the stamped `world-build.json` record.

## Validation

- 419 TypeScript tests passed across shared, client and worker packages. The final
  crowd-budget correction also passed its focused unit and browser regressions.
- 48 Python tests passed; Python lint/format and workspace TypeScript checks passed.
- Repository Biome check passed; final client production build passed.
- All 13 coast, regional, crowds and production Chromium scenarios passed across
  the suite run and corrected crowd regression rerun. The six production scenarios
  were rerun successfully against the final marine mask and crowd correction.
- Mobile Chrome emulation passed the six-beach-plus-overview test at five tide
  levels. Desktop and mobile captures total 70 images, with accompanying diagnostics.
- Failure checks cover terrain/regional loading and retry, detailed-city fallback,
  WebGL context loss, water shader failure and delayed manifest loading.
- All four Blender files were finalized with the shared marine mask and validated
  manual/animated boat tide bindings. Reopening the final detailed and overview
  files passed five tide states, sidebar controls and independent camera/tide checks.
- Heavy jobs were serialized; Blender was limited to four threads. The native
  overview preview used eight samples and approximately 1.57 GB peak render memory.

## Remaining limits

- City building footprints/heights are historical 2009 source data, not a current
  complete city survey. Bridge deck elevations include documented approximations.
- The mapped boundary in unknown-depth optical-water gaps is a fixed high-water
  affiliation fallback. Tide-dependent shoreline accuracy applies to measured cells.
- Moving entities and beach activity are simulations/estimates, not observations.
  Wreck Beach uses clearly labeled nearby Spanish Banks conditions.
- Local software WebGL diagnostics reported roughly 12–24 FPS at LOW, a 240 ms
  first world render and up to approximately 28.1 MiB estimated GPU memory. These
  are local test measurements, not physical mobile or hardware GPU benchmarks.
- Captures were generated and inspected; approved pixel-difference baselines are
  opt-in via `COAST_VISUAL_BASELINES=1`. Physical-device performance and independent
  qualitative recognition remain acceptance work for deployment.
- The successful build retains bundler warnings about large chunks and an existing
  `manualChunks` compatibility warning. No dependency migration was undertaken.
