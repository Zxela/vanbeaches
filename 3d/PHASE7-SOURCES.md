# Living harbour: simulation and source decisions

All moving entities in this release are **SIMULATED**, including when the weather
controls say LIVE. No AIS, ADS-B, ferry arrival feed, observed identifiers, or actual
vessel/flight schedules are supplied. Source identifiers are `procedural-vancouver-v1`;
the shared normalized state carries type, subtype, projected metre position,
altitude, heading, speed, ISO timestamp, source and `live: false`.

Research checked 2026-09-19:

- [Spire Standard AIS](https://spire.com/maritime/solutions/standard-ais/) offers a
  legitimate commercial AIS integration, advertising average near-shore refresh
  around one minute and offshore refresh around six minutes. This is not an
  unrestricted browser feed. No agreement, credentials or redistribution rights
  are configured here. Before integration, obtain the applicable licence,
  attribution, retention/redistribution terms and contracted request limits;
  protect credentials server-side and expose observation age rather than claiming
  all vessel positions are instantaneous.
- [Spire Messages API](https://documentation.spire.com/messages-api/available-ais-message-types/)
  documents AIS message access and query result limits. Result-size limits are not
  evidence of an unlimited request entitlement. Do not scrape third-party maps.
- [OpenSky terms](https://opensky-network.org/about/terms-of-use) require a written
  agreement for operational REST integration, including non-profit live products.
  No such agreement is configured. Its
  [official API documentation](https://github.com/openskynetwork/opensky-api/blob/master/docs/free/rest.rst)
  describes OAuth2, bounding-box-dependent credits, per-tier allowances and 429
  retry headers. Any future authorized integration must cache server-side, respect
  the current allowance and retry headers, attribute OpenSky, expose stale data and
  gaps, and never label extrapolated or simulated positions as observed LIVE data.
- [False Creek Ferries' operator route map](https://granvilleislandferries.bc.ca/wp-content/uploads/2024/07/fcf-map-schedule-may-2023.pdf)
  supplies geographic context for the creek corridor. Authored centreline routes
  are approximate demonstrations and do not reproduce an operator timetable.

## Geographic and rendering guarantees

Routes use geographic waypoints projected through the existing EPSG:3157 origin.
Marine paths are piecewise linear, never corner-cutting splines. The entire route
and its hull-width corridor are checked against the Phase 6 connected ocean mask
at ten-metre intervals, including tide and draft. Unknown or disconnected water
suppresses the route; an unavailable atlas suppresses all boats. The snapshot
reports how many routes were suppressed. These are visualization checks, not a
marine navigation product. Narrow surveyed-coverage gaps can hide creek ferries.

English Bay has three commercial vessels and six recreational sailing paths;
False Creek and the inner harbour have three ferry paths. Two YVR approach/departure
paths, a harbour floatplane, a helicopter and twelve gulls use actual metre scales.
Traffic is optional and gets lane positions from the same source bridge polylines
and deck elevations used to build the visible city geometry. Aircraft/traffic move
one way, with aircraft hidden between procedural trips. Ferries dwell and return.

Geometry is opaque instanced world geometry, with shared logarithmic depth,
observer-relative Earth curvature, atmosphere, sunlight and haze. Navigation lights
are small geometry and cannot show through terrain. No always-visible UI sprites.
At most nine subtype batches and 32 instances per batch are allocated. Updates run
at 12.5 Hz (5 Hz in low detail), distance/frustum cull each entity and disable small
birds and optional traffic in low detail. Wind affects sail heel, not navigability.
Reduced motion freezes movement and bobbing; timeline timestamps give deterministic
positions. Existing shared clouds and water supply other ambient motion.

Tests cover deterministic interpolation, corner preservation, ferry dwell/return,
one-way aircraft, source labeling, anchors, missing navigation, corridor obstruction,
and tide/draft checks. Final browser validation should check silhouettes at beach,
overview and bridge viewpoints, occlusion behind buildings, and draw-call cost.

## Native Blender scene

`blender/moving.py` builds native shared low-poly meshes and bounded one-second
keyframes for the same simulated routes. `scripts/export-moving-routes.cjs`
exports the browser definitions to `config/moving-routes.json`; run it after route
changes or changing the world origin. The builder verifies the origin and checks
marine corridors using the current published height and connectivity PNGs. Boat
Z and visibility use drivers referencing the existing Ocean tide controls; tide
animation and manual changes remain intact. Each boat is hidden below its route's
lowest validated tide, so creek ferries can appear when their sills are submerged.
The saved scene includes `moving-entities-validation.json` and
SIMULATED collection/object labels. Native meshes use normal Blender depth and
shared scene lighting/atmosphere. Pure Python tests check native/browser positioning
parity and fail-closed marine corridor validation without launching Blender.
