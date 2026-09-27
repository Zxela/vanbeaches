"""Tide-dependent marine connectivity; missing surveys are barriers, never invented seabed."""

import heapq
import json
from pathlib import Path

import numpy as np
import rasterio

from gis.common import World, sha256, write_json


def connection_levels(heights, seeds, maximum=5.0):
    """Minimum sea level connecting each cell to a surveyed marine seed (4 neighbours)."""
    rows, cols = heights.shape
    levels = np.full(heights.shape, np.inf, dtype=np.float32)
    queue = []
    for row, col in zip(*np.where(seeds & np.isfinite(heights))):
        level = float(heights[row, col])
        if level <= maximum:
            levels[row, col] = level
            heapq.heappush(queue, (level, int(row), int(col)))
    while queue:
        level, row, col = heapq.heappop(queue)
        if level > levels[row, col]:
            continue
        for r, c in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
            if not (0 <= r < rows and 0 <= c < cols) or not np.isfinite(heights[r, c]):
                continue
            candidate = max(level, float(heights[r, c]))
            if candidate <= maximum and candidate < levels[r, c]:
                levels[r, c] = candidate
                heapq.heappush(queue, (candidate, r, c))
    return levels


def prepare(world):
    with rasterio.open(world.processed / "coast.tif") as dataset:
        heights = dataset.read(1)
        profile = dataset.profile
    with rasterio.open(world.processed / "provenance.tif") as dataset:
        provenance = dataset.read(1)
    # NONNA measurements below the minimum tide are unambiguous marine seeds.
    # Each connected deep survey region seeds itself, so survey holes don't cut off bays.
    seeds = (provenance == 2) & (heights < -5)
    maximum = 8 + world.config["vertical"]["chart_datum_offset_m"]
    levels = connection_levels(heights, seeds, maximum)
    path = world.processed / "marine-connectivity.tif"
    profile.update(dtype="float32", nodata=np.nan, count=1)
    with rasterio.open(path, "w", **profile) as dataset:
        dataset.write(np.where(np.isfinite(levels), levels, np.nan), 1)
    report = {
        "worldConfigSha256": world.key,
        "algorithm": "4-neighbour minimax connection to NONNA below -5m world; unknown barriers",
        "sourceSha256": sha256(world.processed / "coast.tif"),
        "maximumWorldLevel": maximum,
        "connectedCells": int(np.isfinite(levels).sum()),
        "unknownCells": int((~np.isfinite(heights)).sum()),
        "tides": [
            {
                "heightCD": cd,
                "wetCells": int(
                    (levels < cd + world.config["vertical"]["chart_datum_offset_m"]).sum()
                ),
            }
            for cd in (0.5, 1.5, 3.0, 4.5, 5.0)
        ],
    }
    write_json(world.metadata / "latest-marine.json", report)
    return path


def publish(world, output=None, update_manifest=True):
    from export.generate_manifest import elevation_texture
    from gis.marine_affiliation import acquire, optical_cells, sea_polygons

    output = Path(output or Path(__file__).resolve().parents[2] / "client/public/coast-assets")
    path = prepare(world)
    with rasterio.open(world.processed / "coast.tif") as dataset:
        heights, profile = dataset.read(1), dataset.profile
        transform, bounds = dataset.transform, dataset.bounds
    with rasterio.open(world.processed / "provenance.tif") as dataset:
        seeds = (dataset.read(1) == 2) & (heights < -5)
    with rasterio.open(path) as dataset:
        levels = dataset.read(1)
    lines, receipt = acquire(world)
    polygons = sea_polygons(lines, bounds)
    optical = optical_cells(heights, seeds, polygons, transform)
    # This sentinel is an always-visible optical column, NOT inferred bathymetry.
    # Keep marine-connectivity.tif and coast.tif unchanged for scientific consumers.
    surface_path = world.processed / "marine-surface.tif"
    surface = np.where(optical, -512, levels)
    with rasterio.open(surface_path, "w", **profile) as dataset:
        dataset.write(surface.astype(np.float32), 1)
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    descriptor = elevation_texture(surface_path, output, [*world.origin, 0], "marine", optical)
    descriptor.update(
        {
            "opticalOnlyCells": int(optical.sum()),
            "opticalOnlyAreaM2": float(optical.sum() * transform.a * -transform.e),
            "opticalEncoding": "Blue=255: 2D OSM sea affiliation only; no surveyed depth; RG sentinel -512m",
            "opticalLimitation": "Fixed mapped sea affiliation only inside unknown survey cells; tide/bed relationship is unknown there",
            "sourceAttribution": "OpenStreetMap contributors, ODbL 1.0",
            "sources": [receipt],
        }
    )
    write_json(world.metadata / "latest-marine-export.json", descriptor)
    if update_manifest:
        manifest["marineTexture"] = descriptor
        write_json(manifest_path, manifest)
    print(json.dumps(descriptor))
    return descriptor


if __name__ == "__main__":
    publish(World())
