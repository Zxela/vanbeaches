"""Sourced two-dimensional sea affiliation for optical rendering of survey gaps only."""

import datetime
import json
import urllib.parse
import urllib.request

import numpy as np
from rasterio.features import rasterize
from scipy import ndimage
from shapely import contains_xy
from shapely.geometry import LineString, box
from shapely.ops import polygonize, unary_union

from gis.common import fingerprint, sha256, write_json


def acquire(world, refresh=False):
    folder = world.raw / "marine"
    folder.mkdir(exist_ok=True)
    path = folder / "osm-coastline.json"
    receipt_path = folder / "osm-coastline.source.json"
    west, south, east, north = world.bounds_ll
    # Extend discovery beyond the raster so complete ways cross its clipping edge.
    query = (
        "[out:json][timeout:60];way[natural=coastline]"
        f"({south - 0.02},{west - 0.02},{north + 0.02},{east + 0.02});out tags geom;"
    )
    url = "https://overpass-api.de/api/interpreter"
    key = fingerprint({"url": url, "query": query})
    receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
    if refresh or not path.exists() or receipt.get("requestKey") != key:
        request = urllib.request.Request(
            url + "?" + urllib.parse.urlencode({"data": query}),
            headers={"User-Agent": "VanBeachesGIS/1.0 bounded offline coastal affiliation"},
        )
        with urllib.request.urlopen(request, timeout=90) as response:
            encoded = response.read(4_000_001)
        if len(encoded) > 4_000_000:
            raise ValueError("Coastline response exceeds bounded download budget")
        data = json.loads(encoded)
        if data.get("remark") or not data.get("elements"):
            raise ValueError("Incomplete coastline response")
        path.write_bytes(encoded)
        receipt = {
            "id": "osm-coastline-optical-affiliation",
            "url": "https://www.openstreetmap.org/copyright",
            "definition": "https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline",
            "query": query,
            "requestKey": key,
            "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "sha256": sha256(path),
            "license": "ODbL 1.0; copyright OpenStreetMap contributors",
            "purpose": "2D optical sea affiliation in unknown survey cells; not elevation or depth",
        }
        write_json(receipt_path, receipt)
    if sha256(path) != receipt["sha256"]:
        raise ValueError("Coastline receipt checksum mismatch")
    data = json.loads(path.read_text())
    lines = []
    for element in data["elements"]:
        geometry = element.get("geometry", [])
        if len(geometry) >= 2:
            lines.append([world.project.transform(p["lon"], p["lat"]) for p in geometry])
    return lines, receipt


def sea_polygons(lines, bounds):
    """Polygonize complete directed coastlines; reject ambiguous/unclosed components.

    OSM defines sea on the right, land on the left. Both sides of every retained
    segment are sampled. A candidate with even one land-side vote is rejected.
    """
    extent = box(*bounds)
    geometries = []
    right, left = [], []
    for points in lines:
        line = LineString(points).intersection(extent)
        if not line.is_empty:
            geometries.append(line)
        for a, b in zip(points, points[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = np.hypot(dx, dy)
            if length < 0.05:
                continue
            # Classify the immediate topological side, not a metre-wide strip:
            # narrow mapped rocks/piers can legitimately be under one metre wide.
            offset = min(0.01, length / 4)
            x, y = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            right.append((x + dy / length * offset, y - dx / length * offset))
            left.append((x - dy / length * offset, y + dx / length * offset))
    if not geometries or not right:
        return []
    right, left = np.asarray(right), np.asarray(left)
    candidates = polygonize(unary_union([extent.boundary, *geometries]))
    return [
        polygon
        for polygon in candidates
        if contains_xy(polygon, right[:, 0], right[:, 1]).any()
        and not contains_xy(polygon, left[:, 0], left[:, 1]).any()
    ]


def optical_cells(heights, seeds, polygons, transform):
    """Accept only sourced sea components backed by measured deep marine samples."""
    if not polygons:
        return np.zeros(heights.shape, dtype=bool)
    affiliation = rasterize(
        [(polygon, 1) for polygon in polygons],
        out_shape=heights.shape,
        transform=transform,
        fill=0,
        dtype="uint8",
    ).astype(bool)
    components, _ = ndimage.label(affiliation)
    seeded = np.unique(components[seeds & affiliation])
    seeded = seeded[seeded != 0]
    return ~np.isfinite(heights) & np.isin(components, seeded)
