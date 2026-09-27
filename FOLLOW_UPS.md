# Follow-ups after phases 6–8

This is the prioritized backlog accompanying the phases 6–8 release. The implemented
world has passed local automated checks, native Blender validation and desktop/mobile
emulation captures. The items below record remaining limitations and future work; they
are not claims that physical-device testing, approved visual baselines or live movement
feeds have already been completed. Deployment status belongs in the release record.

Start with [production operations](3d/PRODUCTION.md), [coastal topology](3d/COASTAL-TOPOLOGY.md),
[urban sources](3d/URBAN.md) and [movement sources](3d/PHASE7-SOURCES.md). Priorities below
describe the order of follow-up work, not an instruction to rebuild every subsystem.

## P1 — next reliability and acceptance work

- [ ] **Measure physical mobile and hardware-GPU performance.** Exercise current iOS Safari,
  Android Chrome and a representative desktop GPU on the deployed build. Record device,
  OS/browser, world ID, network conditions, quality tier, first render/detail timings,
  frame-time percentiles, draw calls, estimated GPU storage and thermal behavior during
  a sustained beach-navigation session. Local software WebGL measurements of roughly
  12–24 FPS at LOW are not physical-device benchmarks. **Done when:** agreed device budgets
  are documented, repeat navigation does not grow retained resources without bound, and
  coast, skyline, bridges and mountains remain recognizable at the chosen quality.

- [ ] **Approve visual baselines and independent geographic recognition.** Review the six
  canonical beaches plus overview at five tides, including natural/depth modes. Obtain a
  Vancouver resident's review without labels. Existing 70 desktop/mobile-emulation captures
  are evidence, not approved pixel-difference references. **Done when:** a fixed
  OS/browser/GPU reference platform and reviewed images are retained, the
  `COAST_VISUAL_BASELINES=1` comparison runs detect intentional shoreline/skyline changes,
  and baseline updates require review rather than automatic acceptance.

- [ ] **Add recovery for initial coarse-city failure.** Detailed-city failure already keeps
  the coarse skyline, but the first coarse asset request is latched by `started`; terrain
  retry does not retry it. Add bounded retry/backoff and a clear user retry path for both
  urban stages. **Done when:** fail the initial coarse request, restore the network, and
  recover buildings/bridges without reloading the whole page, duplicate geometry, retry
  storms or broken terrain navigation; disposal cancels outstanding retries.

- [ ] **Review accessibility and responsive controls on real devices.** Check keyboard-only
  exploration, focus after renderer failure/reload, screen-reader conditions and freshness,
  reduced motion, contrast, text zoom and small landscape screens. **Done when:** selected
  beach conditions and recovery actions remain usable outside canvas, controls do not
  obscure essential information, and these checks have recorded results.

- [ ] **Verify the deployed asset and fallback paths.** Retain the deployed world ID,
  archive SHA-256, application revision and a known-good rollback pair. Exercise cold
  loading, cached loading, a deep beach URL, unavailable environment data and a missing
  asset against the deployment. **Done when:** published files match the build inventory,
  attribution is reachable, old and new manifests cannot mix assets, and rollback has
  a documented procedure. Ordinary web deployments must continue to avoid GIS/Blender.

## P2 — data accuracy, rendering and delivery

- [ ] **Refresh the historical city model deliberately.** Building footprints/heights are
  from 2009; coastal LiDAR and imagery have their own acquisition dates, including 2022
  sources. The model is not a current complete Metro Vancouver survey. Evaluate newer
  licensed footprints/heights and incremental coverage before undertaking new LAS scans.
  **Done when:** source dates, licences and receipts are retained; additions/removals are
  reviewed geographically; coarse/detail versions preserve the same building heights;
  and source refresh does not exceed the urban asset/runtime budgets.

- [ ] **Improve bridge elevation evidence and coastal detail.** Current decks and some
  structures use documented visual approximations on sourced alignments. Verify deck/top
  elevations against suitable evidence and refine only details that improve geographic
  recognition. **Done when:** coordinate/datum checks and bridge viewpoint captures pass,
  recorded elevation uncertainty is updated, and no visualization value is presented as
  an authoritative navigational clearance.

- [ ] **Reduce survey gaps with real elevation data.** Unknown cells may show optical water
  using OSM's mapped high-water sea affiliation. That fallback has a fixed boundary within
  gaps, supplies no bed depth and cannot authorize vessel travel. Seek compatible surveys
  and improve datum evidence before replacing it. **Done when:** real-source coverage
  gains and datum uncertainty are reported, known-cell elevations remain traceable, five
  tide tests pass, and unknown/optical-only cells remain excluded from depth and navigation
  claims. Do not fill holes with invented seabed merely to remove visual artifacts.

- [ ] **Resolve bundle and build-configuration warnings.** The successful build retained
  large-chunk and existing `manualChunks` compatibility warnings. Audit the supported
  bundler configuration and route-level loading before changing dependencies or splitting
  packages. **Done when:** the warnings are resolved or have a documented, measured reason
  to remain; cold-load transfer/parse costs improve without duplicate Three.js instances,
  broken decoder URLs, service-worker cache regressions or world-asset rebuilds.

- [ ] **Clarify and improve Wreck Beach conditions.** Wreck is a regional viewpoint and
  currently displays explicitly labeled nearby Spanish Banks conditions. Evaluate a proper
  Wreck environmental location and reviewed beach/activity masks independently of camera
  composition. **Done when:** location-specific requests, freshness and fallback labeling
  are verified, or the nearby-data limitation remains clear in both visual and accessible
  UI; no nearby estimate is represented as a Wreck measurement.

## P3 — optional features and ongoing maintenance

- [ ] **Keep simulated movement and crowd estimates distinct from observations.** Ships,
  ferries, aircraft, traffic and beach activity are illustrative even when weather says
  LIVE. SeaBus is suppressed because its route crosses missing depth coverage. Review
  activity masks and route plausibility; restore routes only when their full hull corridor
  has adequate measured coverage. **Done when:** deterministic/reduced-motion behavior,
  tide/draft checks and explicit SIMULATED/estimated labels survive every quality tier.

- [ ] **Assess live feeds only as a separately scoped integration.** AIS, ADS-B and ferry
  feeds are not configured. Recheck provider terms and availability when selecting a
  source; the September 2026 research is a starting point. **Done when:** applicable usage
  rights and limits are established, credentials remain server-side, caching/backoff and
  stale/outage behavior are tested, and observed, predicted and simulated positions retain
  distinct provenance. Avoid dependencies on scraped third-party maps.

- [ ] **Maintain reproducible assets and independent subsystem rebuilds.** Retain source
  receipts, acquisition hashes, configuration fingerprints and immutable release bundles.
  Periodically test a clean bundle restore and regeneration of one selected subsystem.
  Keep notices synchronized with exported assets, review dependency/security updates,
  and check cache cleanup, decoder compatibility and source-service failures.
  **Done when:** the restored package verifies, the chosen subsystem rebuild does not
  silently invalidate unrelated products, and the resulting manifest has a new verified
  world identity with an available rollback version.

- [ ] **Expand coverage where it provides evidence.** Add physical-browser coverage beyond
  Chromium/emulation and focused regressions for coarse-city recovery, asset interruption,
  repeated context loss and disposal. Review local diagnostics before adding any remote
  monitoring. **Done when:** new checks exercise meaningful failure behavior, heavy jobs
  run serially on constrained hardware, and any future collection has an explicit purpose
  without unnecessary identifiers. Current telemetry remains local and session-only.

For each completed item, record the application revision, world ID, device/source context
and verification artifact. Update the relevant subsystem documentation alongside the code.
