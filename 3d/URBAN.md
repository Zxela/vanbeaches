# Urban context (Phase 6)

Run `3d/.venv/Scripts/python.exe 3d/pipeline.py urban` from the repository root.
This downloads bounded sources once, builds independent urban JSON assets and updates
the web manifest. It does not start Blender, read LAS, regenerate terrain, or rebuild
regional mountains. `urban-export` uses the same hash-checked cache. `--refresh` explicitly
redownloads. `marine` separately publishes the dynamic ocean-connectivity texture.

The next normal `blender`/`world` scene build imports the processed urban asset with merged
building tiles and merged roads, bridges, waterfront and land-cover objects. Overview
Blender builds retain skyline buildings and bridges. Existing saved `.blend` files only
change when a Blender build runs. The normal web `export` republishes existing urban data
after terrain/regional assets and then publishes marine connectivity.

## Data, coverage and accuracy

Building massing uses the City's **2009** LiDAR-derived footprint polygons and `hgt_agl`
height attribute. It does not represent construction since 2009. Selected parts are
12 m or taller, or have footprint area at least 300 m², within longitude
-123.27 to -123.095 and latitude 49.245 to 49.333. This includes downtown/West End,
Point Grey and beach-facing city context; it is not a complete Metro Vancouver model.
Parts under 20 m² and invalid/nonphysical heights are omitted. Footprints are simplified
by 0.7 m while retaining topology. Heights remain measured City attributes. The terrain
base comes from cached 10 m City/Metro ground with the City base elevation as a fallback.
New LAS building classification scans were intentionally unnecessary: the City already
provides authoritative derived heights and processing large point clouds would duplicate
that work. No Google imagery or proprietary 3D assets are used.

Source: [City building footprints 2009](https://opendata.vancouver.ca/explore/dataset/building-footprints-2009/),
Open Government Licence – Vancouver. Raw source rows preserve original City identifiers,
top/base elevations, area and geometry. Urban geometry records retain source IDs and height
provenance. City footprints were preferred over OSM's incomplete height tagging.

Roads, bridges, forest/park/sand polygons, seawall routes, piers and breakwaters come from
bounded OpenStreetMap queries. Pacific Spirit Regional Park uses OSM multipolygon relation
11683817. Line segments are sampled at no more than 25 m spacing and draped on measured
terrain. OSM tunnels remain explicitly tagged for runtime exclusion. The four major bridge
structures select the longest connected main carriageway, without copying parallel cycleways
or adding separate bridge objects for every source road segment.

Lions Gate's two tower positions come from the centroids of actual OSM `bridge:support=pylon`
footprints, ways 497479010 and 497479011. Their tagged height is 111 m. Their projected
fractions along the complete mapped bridge/approach road are approximately 0.15621 and
0.44920. Treat `towerHeight` and tower `height` as approximate world top elevations, not
height added to the deck. Deck heights (67, 25, 29 and 18 m for Lions Gate, Burrard,
Granville and Cambie respectively) are explicit coarse visual estimates, not surveyed
bridge engineering elevations. Lions Gate's 67 m estimate allows a deck/superstructure
allowance above the [CSCE's reported 61 m clearance](https://legacy.csce.ca/en/historic-site/lions-gate-bridge/).
Other supports and cables are simplified silhouettes on sourced bridge alignment.

Land-cover polygons include indexed `vertices` and `faces`, not just perimeter rings.
Each vertex is sampled from cached measured terrain; triangles have no edge longer than
100 m. Triangles outside the source polygon, crossing polygon holes, or with unknown
ground are omitted. This prevents broad park polygons from spanning terrain as flat sheets.
It is coarse surface coloration rather than an inventory of individual trees.

OpenStreetMap data: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
The independently exported OSM-derived urban database is available in the distributed JSON
assets. Source query fingerprints, retrieval timestamps, licences and SHA-256 digests are
included. Terrain hashes invalidate the urban cache when source ground changes.

## Portable schema and budgets

`schemaVersion: 1` coordinates are **local east, north, up metres**, matching Blender.
Three.js conversion is `[x, z, -y]`. The asset is independent from the terrain GLBs.

- `buildings`: `{id, footprint:[[x,y],...], holes?, base, height, heightSource, groundSource, tile, lod}`.
- `roads`: `{id, name, points:[[x,y,z],...], width, kind:'road'|'bridge'|'tunnel'}`.
- `bridges`: `{id, name, points, width, deckHeight, towerHeight, style, sourceIds, towers?, towerFractions?}`.
- `landcover`: `{id, name, ring:[[x,y,z],...], kind:'forest'|'park'|'sand', vertices, faces}`.
- `waterfront`: `{id, name, points, width, kind:'seawall'|'pier'|'breakwater'}`.

The skyline asset retains exactly the same footprint/base/height values for parts 35 m
or taller, plus bridges and land cover. Roads and waterfront are loaded with the detailed
asset. Full assets are limited to 7 MB uncompressed; content-hashed filenames permit long
cache lifetimes. Runtime geometry can merge buildings by kilometre tile/material, avoiding
one draw call per building. Coarse/fine loads must replace, not stack, duplicate objects.

`3d/data/metadata/latest-urban-export.json` is the exact `manifest.urban` descriptor,
including both asset URLs, SHA-256 hashes, byte lengths, counts and attribution.
`3d/data/processed/<world-key>/urban/urban.json` is Blender's reproducible input.

Validation: `3d/.venv/Scripts/python.exe -m pytest 3d/tests/test_urban.py` tests projected
coordinates, bounded terrain triangulation, holes, unknown-ground exclusion, measured
height preservation between LODs, major bridge coverage and sourced Lions Gate tower span.
