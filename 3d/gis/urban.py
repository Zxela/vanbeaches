"""Bounded, independently cached City footprints and OSM urban context.

No Blender, LAS scans, terrain rebuild or network access is needed on a cache hit.
Coordinates remain local east/north/up; web consumers map them to [x,z,-y].
"""

import datetime
import hashlib
import json
import math
import urllib.parse
import urllib.request
from collections import Counter

import numpy as np
import rasterio
from shapely.geometry import LineString, MultiPoint, Polygon, shape
from shapely.ops import linemerge, polygonize, transform, triangulate

from gis.common import ROOT, fingerprint, sha256, write_json

CITY = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/building-footprints-2009"
OVERPASS = "https://overpass-api.de/api/interpreter"


def fetch(world, config, refresh=False):
    folder = world.raw / "urban"
    folder.mkdir(exist_ok=True)
    west, south, east, north = config["bounds"]
    polygon = (
        f"POLYGON(({west} {south},{east} {south},{east} {north},{west} {north},{west} {south}))"
    )
    where = (
        f"within(geom, geom'{polygon}') AND (hgt_agl >= "
        f"{config['buildingMinimumHeight']} OR area_m2 >= {config['buildingMinimumArea']})"
    )
    city_url = (
        CITY
        + "/exports/json?"
        + urllib.parse.urlencode(
            {"where": where, "select": "id,bldgid,hgt_agl,baseelev_m,topelev_m,area_m2,geom"}
        )
    )
    bbox = f"({south},{west},{north},{east})"
    selectors = [
        '[highway~"^(motorway|trunk|primary|secondary|tertiary)$"]',
        "[bridge][highway]",
        "[leisure=park]",
        '[natural~"^(wood|beach)$"]',
        "[landuse=forest]",
        '[highway][name~"Seawall|Stanley Park Drive"]',
        '[man_made~"^(pier|breakwater)$"]',
        "[leisure=swimming_pool][name]",
    ]
    query = (
        "[out:json][timeout:90];("
        + "".join(f"way{s}{bbox};" for s in selectors)
        + ");out tags geom;"
    )
    park_query = '[out:json][timeout:30];relation[type=multipolygon][name~"Pacific Spirit"](49.245,-123.27,49.31,-123.20);out body geom;'
    tower_query = '[out:json][timeout:30];(node["bridge:support"](49.31,-123.145,49.33,-123.12);way["bridge:support"](49.31,-123.145,49.33,-123.12););out tags geom;'
    requests = [
        ("city-buildings", city_url, None, "Open Government Licence - Vancouver", CITY),
        (
            "osm-context",
            OVERPASS,
            urllib.parse.urlencode({"data": query}).encode(),
            "ODbL 1.0; copyright OpenStreetMap contributors",
            "https://www.openstreetmap.org/copyright",
        ),
        (
            "osm-parks",
            OVERPASS + "?" + urllib.parse.urlencode({"data": park_query}),
            None,
            "ODbL 1.0; copyright OpenStreetMap contributors",
            "https://www.openstreetmap.org/copyright",
        ),
        (
            "osm-towers",
            OVERPASS + "?" + urllib.parse.urlencode({"data": tower_query}),
            None,
            "ODbL 1.0; copyright OpenStreetMap contributors",
            "https://www.openstreetmap.org/copyright",
        ),
    ]
    sources = []
    for name, url, body, licence, source in requests:
        path = folder / (name + ".json")
        sidecar = path.with_suffix(".source.json")
        request_key = fingerprint({"url": url, "body": body.decode() if body else None})
        cached = json.loads(sidecar.read_text()) if sidecar.exists() else {}
        if refresh or not path.exists() or cached.get("requestKey") != request_key:
            request = urllib.request.Request(
                url, data=body, headers={"User-Agent": "VanBeachesGIS/1.0 offline asset build"}
            )
            print(f"Downloading bounded {name}", flush=True)
            with urllib.request.urlopen(request, timeout=120) as response:
                blob = response.read(40_000_001)
            if len(blob) > 40_000_000:
                raise ValueError("Urban source exceeds bounded download budget")
            data = json.loads(blob)
            if isinstance(data, dict) and data.get("remark"):
                raise ValueError(f"Incomplete Overpass response: {data['remark']}")
            path.write_bytes(blob)
            cached = {
                "id": name,
                "url": source,
                "license": licence,
                "requestKey": request_key,
                "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "sha256": sha256(path),
            }
            write_json(sidecar, cached)
        if sha256(path) != cached["sha256"]:
            raise ValueError(f"Urban source hash mismatch: {path}")
        sources.append(cached)
    return folder, sources


class Ground:
    """Sample only small cached overview rasters, never load the 2m world."""

    def __init__(self, world):
        self.world = world
        self.samples = {}
        self.datasets = []
        for filename in ("land-10m.tif", "metro-ground-full-10m.tif", "coast.tif"):
            path = world.processed / filename
            if path.exists():
                dataset = rasterio.open(path)
                # Three existing 10m grids total about 15 MB; avoid tens of thousands
                # of random compressed-TIFF reads while draping polygon interiors.
                self.datasets.append((dataset, dataset.read(1)))

    def sample(self, x, y, fallback=0):
        key = (round(x, 2), round(y, 2))
        if key in self.samples:
            return self.samples[key]
        east, north = x + self.world.origin[0], y + self.world.origin[1]
        for dataset, array in self.datasets:
            if not (
                dataset.bounds.left <= east <= dataset.bounds.right
                and dataset.bounds.bottom <= north <= dataset.bounds.top
            ):
                continue
            row, col = dataset.index(east, north)
            if not (0 <= row < dataset.height and 0 <= col < dataset.width):
                continue
            value = array[row, col]
            if np.isfinite(value) and value != dataset.nodata:
                self.samples[key] = round(float(value), 2)
                return self.samples[key]
        return fallback

    def close(self):
        for dataset, _ in self.datasets:
            dataset.close()


def local_geometry(world, geometry):
    def project(x, y, z=None):
        a, b = world.project.transform(x, y)
        return np.asarray(a) - world.origin[0], np.asarray(b) - world.origin[1]

    return transform(project, geometry)


def ring_points(ring):
    return [[round(x, 2), round(y, 2)] for x, y in list(ring.coords)[:-1]]


def bridge_name(tags):
    value = tags.get("name:en", tags.get("name", "")) + " " + tags.get("bridge:name", "")
    for token, name in (
        ("Lions Gate", "Lions Gate Bridge"),
        ("Burrard", "Burrard Bridge"),
        ("Granville", "Granville Bridge"),
        ("Cambie", "Cambie Bridge"),
    ):
        if token in value:
            return name
    return None


def landcover_mesh(polygon, ground, spacing=60):
    """Triangulate surveyed samples inside each source polygon; unknown terrain stays absent."""
    points = []
    for ring in (polygon.exterior, *polygon.interiors):
        line = LineString(ring.coords)
        points.extend(
            tuple(line.interpolate(distance).coords[0])
            for distance in np.linspace(0, line.length, max(3, math.ceil(line.length / spacing)))
        )
        points.extend(list(ring.coords)[:-1])
    west, south, east, north = polygon.bounds
    from shapely.geometry import Point

    points.extend(
        (x, y)
        for x in np.arange(west, east, spacing)
        for y in np.arange(south, north, spacing)
        if polygon.contains(Point(x, y))
    )
    triangles = [
        triangle for triangle in triangulate(MultiPoint(points)) if polygon.covers(triangle)
    ]
    vertices, faces, indices = [], [], {}
    for triangle in triangles:
        corners = list(triangle.exterior.coords)[:3]
        if max(math.dist(a, b) for a in corners for b in corners) > 100:
            continue
        heights = [ground.sample(x, y, float("nan")) for x, y in corners]
        if not all(math.isfinite(z) for z in heights):
            continue
        face = []
        for (x, y), z in zip(corners, heights):
            key = (round(x, 2), round(y, 2))
            if key not in indices:
                indices[key] = len(vertices)
                vertices.append([*key, round(z + 0.6, 2)])
            face.append(indices[key])
        faces.append(face)
    return vertices, faces


def build(world, config, folder, sources):
    ground = Ground(world)
    result = {
        "schemaVersion": 1,
        "worldConfigSha256": world.key,
        "configSha256": fingerprint(config),
        "coordinates": "local east,north,up metres",
        "sources": sources,
        "buildings": [],
        "roads": [],
        "bridges": [],
        "landcover": [],
        "waterfront": [],
    }
    city = json.loads((folder / "city-buildings.json").read_text(encoding="utf-8"))
    for row in city:
        geometry = local_geometry(world, shape(row["geom"]["geometry"]))
        polygons = list(geometry.geoms) if geometry.geom_type == "MultiPolygon" else [geometry]
        for index, polygon in enumerate(polygons):
            polygon = polygon.simplify(
                config["footprintSimplificationMetres"], preserve_topology=True
            )
            if not polygon.is_valid or polygon.area < 20:
                continue
            height = row.get("hgt_agl")
            if height is None or not math.isfinite(height) or height < 2 or height > 350:
                continue
            centre = polygon.centroid
            source_base = row.get("baseelev_m") or 0
            base = ground.sample(centre.x, centre.y, source_base)
            item = {
                "id": f"city-{row['id']}-{index}",
                "footprint": ring_points(polygon.exterior),
                "base": round(max(base, source_base - 2), 2),
                "height": round(height, 2),
                "heightSource": "city-lidar-2009",
                "groundSource": "cached-terrain-or-city-base",
                "tile": f"{math.floor(centre.x / 1000)}_{math.floor(centre.y / 1000)}",
                "lod": "skyline" if height >= config["skylineMinimumHeight"] else "mid",
            }
            if polygon.interiors:
                item["holes"] = [ring_points(ring) for ring in polygon.interiors]
            result["buildings"].append(item)
    osm = json.loads((folder / "osm-context.json").read_text(encoding="utf-8"))
    for name in ("osm-parks", "osm-towers"):
        osm["elements"].extend(
            json.loads((folder / f"{name}.json").read_text(encoding="utf-8"))["elements"]
        )
    elements = list(osm["elements"])
    for relation in osm["elements"]:
        if relation["type"] != "relation":
            continue
        lines = [
            LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
            for m in relation.get("members", [])
            if m.get("role") == "outer" and len(m.get("geometry", [])) >= 2
        ]
        for index, polygon in enumerate(polygonize(lines)):
            elements.append(
                {
                    "id": f"relation-{relation['id']}-{index}",
                    "tags": relation["tags"],
                    "geometry": [{"lon": x, "lat": y} for x, y in polygon.exterior.coords],
                }
            )
    for element in elements:
        tags = element.get("tags", {})
        coords = [(p["lon"], p["lat"]) for p in element.get("geometry", []) if "lon" in p]
        if len(coords) < 2:
            continue
        line = local_geometry(world, LineString(coords)).simplify(2)
        name = tags.get("name:en", tags.get("name", ""))
        is_bridge = tags.get("bridge", "no") != "no"
        bridge = bridge_name(tags) if is_bridge else None
        points = []
        # Resample segments separately to preserve source junction/corner alignment.
        for a, b in zip(list(line.coords)[:-1], list(line.coords)[1:]):
            distance = math.dist(a, b)
            steps = max(1, math.ceil(distance / config["roadSampleSpacingMetres"]))
            for i in range(steps):
                t = i / steps
                x, y = a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])
                points.append([round(x, 2), round(y, 2), ground.sample(x, y) + 0.25])
        x, y = line.coords[-1]
        points.append([round(x, 2), round(y, 2), ground.sample(x, y) + 0.25])
        item = {
            "id": f"osm-{element['id']}",
            "name": name,
            "points": points,
            "width": 11 if tags.get("highway") in ("primary", "trunk", "motorway") else 7,
        }
        if bridge:
            specification = config["bridges"][bridge]
            item.update(
                specification,
                name=bridge,
                elevationSource="documented-approximate-deck-world-datum",
            )
            for point in points:
                point[2] = specification["deckHeight"]
            if tags.get("highway") in ("primary", "trunk", "secondary") and "Ramp" not in name:
                result["bridges"].append(item)
        if "highway" in tags:
            is_path = tags["highway"] in ("footway", "path", "cycleway", "pedestrian")
            road = dict(
                item,
                kind="tunnel"
                if tags.get("tunnel", "no") != "no"
                else "bridge"
                if is_bridge
                else "road",
            )
            if is_path:
                result["waterfront"].append(dict(item, kind="seawall", width=3))
            else:
                result["roads"].append(road)
        elif tags.get("man_made") in ("pier", "breakwater"):
            for point in points:
                point[2] = max(2, point[2])
            result["waterfront"].append(dict(item, kind=tags["man_made"], width=5))
        elif (
            coords[0] == coords[-1]
            and len(coords) >= 4
            and (
                tags.get("leisure") == "park"
                or tags.get("natural") in ("wood", "beach")
                or tags.get("landuse") == "forest"
            )
        ):
            polygon = local_geometry(world, Polygon(coords)).simplify(8, preserve_topology=True)
            if polygon.is_valid and polygon.area > 100:
                kind = (
                    "forest"
                    if tags.get("natural") == "wood"
                    or tags.get("landuse") == "forest"
                    or "Pacific Spirit" in name
                    or name == "Stanley Park"
                    else "sand"
                    if tags.get("natural") == "beach"
                    else "park"
                )
                ring = [
                    [x, y, ground.sample(x, y) + 0.35] for x, y in ring_points(polygon.exterior)
                ]
                vertices, faces = landcover_mesh(polygon, ground)
                result["landcover"].append(
                    {
                        "id": item["id"],
                        "name": name,
                        "ring": ring,
                        "kind": kind,
                        "vertices": vertices,
                        "faces": faces,
                    }
                )
    # OSM divides crossings into carriageways, ramps and paths. Pick the longest
    # connected main carriageway for a single structure, keeping every road in roads.
    structures = []
    for name, specification in config["bridges"].items():
        members = [b for b in result["bridges"] if b["name"] == name]
        if not members:
            continue
        merged = linemerge([LineString(b["points"]) for b in members])
        candidates = list(merged.geoms) if merged.geom_type == "MultiLineString" else [merged]
        span = max(candidates, key=lambda line: line.length)
        structures.append(
            {
                "id": name.lower().replace(" ", "-"),
                "name": name,
                "points": [list(p) for p in span.coords],
                **specification,
                "sourceIds": [b["id"] for b in members],
                "elevationSource": "documented-approximate-deck-world-datum",
            }
        )
        if name == "Lions Gate Bridge":
            towers = []
            for element in osm["elements"]:
                if element.get("tags", {}).get("bridge:support") != "pylon":
                    continue
                polygon = local_geometry(
                    world, Polygon([(p["lon"], p["lat"]) for p in element["geometry"]])
                )
                centre = polygon.centroid
                towers.append(
                    {
                        "position": [round(centre.x, 2), round(centre.y, 2), 0],
                        "height": float(element["tags"].get("height", 111)),
                        "sourceId": f"osm-{element['id']}",
                    }
                )
            structures[-1]["towers"] = towers
            structures[-1]["towerFractions"] = sorted(
                round(
                    span.project(shape({"type": "Point", "coordinates": t["position"][:2]}))
                    / span.length,
                    5,
                )
                for t in towers
            )
    result["bridges"] = structures
    ground.close()
    result["counts"] = {
        key: len(result[key])
        for key in ("buildings", "roads", "bridges", "landcover", "waterfront")
    }
    result["heightSources"] = dict(Counter(b["heightSource"] for b in result["buildings"]))
    if not result["buildings"] or not result["roads"]:
        raise ValueError("Urban source result unexpectedly empty")
    missing = set(config["bridges"]) - {b["name"] for b in result["bridges"]}
    if missing:
        raise ValueError(f"Major bridges missing from source: {sorted(missing)}")
    return result


def export(world, result, config, update_manifest=True):
    output = ROOT.parent / "client/public/coast-assets"
    output.mkdir(exist_ok=True)

    def emit(data, prefix):
        blob = json.dumps(data, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()
        if len(blob) > config["maximumAssetBytes"]:
            raise ValueError("Urban asset exceeds configured byte budget")
        digest = hashlib.sha256(blob).hexdigest()
        filename = f"{prefix}-{digest[:12]}.json"
        (output / filename).write_bytes(blob)
        return filename, digest, len(blob)

    asset, digest, size = emit(result, "urban")
    coarse = dict(
        result,
        buildings=[b for b in result["buildings"] if b["lod"] == "skyline"],
        roads=[],
        waterfront=[],
    )
    coarse["counts"] = {key: len(coarse[key]) for key in result["counts"]}
    coarse_asset, coarse_digest, coarse_size = emit(coarse, "urban-skyline")
    descriptor = {
        "schemaVersion": 1,
        "assetUrl": asset,
        "sha256": digest,
        "bytes": size,
        "coarseAssetUrl": coarse_asset,
        "coarseSha256": coarse_digest,
        "coarseBytes": coarse_size,
        "counts": result["counts"],
        "worldConfigSha256": world.key,
        "configSha256": result["configSha256"],
        "sources": result["sources"],
        "sourceAttribution": "City of Vancouver building footprints 2009 (Open Government Licence - Vancouver); OpenStreetMap contributors (ODbL 1.0).",
    }
    write_json(world.processed / "urban/urban.json", result)
    write_json(world.metadata / "latest-urban-export.json", descriptor)
    if update_manifest:
        path = output / "manifest.json"
        manifest = json.loads(path.read_text())
        manifest["urban"] = descriptor
        write_json(path, manifest)
    print(
        json.dumps({"urban": descriptor["counts"], "bytes": size, "coarseBytes": coarse_size}),
        flush=True,
    )
    return descriptor


def run(world, refresh=False, update_manifest=True):
    config = json.loads((ROOT / "config/urban.json").read_text())
    folder, sources = fetch(world, config, refresh)
    cache = world.processed / "urban/urban.json"
    ground_hashes = {
        name: sha256(world.processed / name)
        for name in ("land-10m.tif", "metro-ground-full-10m.tif", "coast.tif")
        if (world.processed / name).exists()
    }
    key = fingerprint(
        {
            "algorithm": 6,
            "world": world.key,
            "config": config,
            "sources": sources,
            "groundSources": ground_hashes,
        }
    )
    result = json.loads(cache.read_text()) if cache.exists() else {}
    if result.get("buildKey") != key:
        result = build(world, config, folder, sources)
        result["buildKey"] = key
        result["groundSources"] = ground_hashes
    return export(world, result, config, update_manifest)
