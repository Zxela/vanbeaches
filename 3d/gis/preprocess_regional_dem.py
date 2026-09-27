"""Visibility-selected regional terrain with error-bounded, skyline-constrained TIN LODs."""

import json
import math
import time

import numpy as np
import rasterio
from scipy.spatial import Delaunay

from .analyze_horizons import analyze, charts, sample_grid
from .common import ROOT, sha256, write_json
from .fetch_regional_dem import RegionalSource, discover, settings


def coast_grid(world):
    with rasterio.open(world.processed / "coast.tif") as ds:
        a = ds.transform
        return {
            "bounds": [
                a.c + a.a / 2,
                a.f + a.e * (ds.height - 0.5),
                a.c + a.a * (ds.width - 0.5),
                a.f + a.e / 2,
            ],
            "spacing": a.a,
            "height": ds.read(1),
        }


def reference_viewpoints(world, coast, manifest):
    """Wreck is a Phase 1 gazetteer reference, absent from the app's destination list."""
    manifest = {**manifest, "beaches": list(manifest["beaches"])}
    if any(b["id"] == "wreck-beach" for b in manifest["beaches"]):
        return manifest
    landmark = next(
        p for p in world.config["validation"]["landmarks"] if p["name"].startswith("Wreck")
    )
    x, y, _ = world.local(landmark["longitude"], landmark["latitude"])
    offsets = np.arange(-400, 401, 10)
    dx, dy = np.meshgrid(offsets, offsets)
    xx, yy = x + world.origin[0] + dx.ravel(), y + world.origin[1] + dy.ravel()
    z = sample_grid(coast, xx, yy)
    valid = np.isfinite(z) & (z > 3) & (z < 15)
    if not valid.any():
        raise ValueError("No measured Wreck Beach low-ground reference")
    i = np.argmin(np.where(valid, dx.ravel() ** 2 + dy.ravel() ** 2, np.inf))
    position = [float(xx[i] - world.origin[0]), float(z[i] + 5), float(world.origin[1] - yy[i])]
    manifest["beaches"].append(
        {
            "id": "wreck-beach",
            "referenceSource": landmark["source"],
            "beachView": {
                "position": position,
                "target": [position[0] - 346.41, position[1] - 3, position[2] - 200],
            },
        }
    )
    return manifest


def adaptive_mesh(grid, error, locked=(), coast_bounds=None, observers=()):
    """Greedy maximum vertical residual per triangle; retain measured skyline and common edges.

    No invented heights or generic polygon decimation. Boundary nodes use every source sample
    so independently simplified neighbouring tiles remain joined at both LODs.
    """
    z = grid["height"]
    rows, cols = z.shape
    w, s, e, n = grid["bounds"]
    spacing = grid["spacing"]
    yy, xx = np.mgrid[:rows, :cols]
    xy = np.column_stack((xx.ravel() * spacing + w, n - yy.ravel() * spacing))
    values = z.ravel()
    tolerance = np.full(len(values), error)
    for ox, oy in observers:
        distance = np.hypot(xy[:, 0] - ox, xy[:, 1] - oy)
        tolerance = np.minimum(
            tolerance,
            np.where(
                distance < 5000, np.maximum(0.05, distance * math.tan(math.radians(0.02))), error
            ),
        )
    finite = np.isfinite(values)
    if finite.sum() < 3:
        return np.empty((0, 3)), np.empty((0, 3), np.int32), 0
    keep = (
        ((xx % 8 == 0) & (yy % 8 == 0))
        | (xx == 0)
        | (yy == 0)
        | (xx == cols - 1)
        | (yy == rows - 1)
    )
    for x, y in locked:
        c, r = round((x - w) / spacing), round((n - y) / spacing)
        keep[max(0, r - 1) : min(rows, r + 2), max(0, c - 1) : min(cols, c + 2)] = True
    if coast_bounds:
        cw, cs, ce, cn = coast_bounds
        # Exact rectangular hole; boundaries are on the existing projected grid.
        boundary = (
            ((abs(xy[:, 0] - cw) < spacing / 2) | (abs(xy[:, 0] - ce) < spacing / 2))
            & (xy[:, 1] >= cs)
            & (xy[:, 1] <= cn)
        ) | (
            ((abs(xy[:, 1] - cs) < spacing / 2) | (abs(xy[:, 1] - cn) < spacing / 2))
            & (xy[:, 0] >= cw)
            & (xy[:, 0] <= ce)
        )
        keep |= boundary.reshape(z.shape)
    keep = keep.ravel() & finite
    max_error = 0
    for _ in range(20):
        selected = np.flatnonzero(keep)
        tin = Delaunay(xy[selected])
        cells = tin.find_simplex(xy)
        transform = tin.transform[np.maximum(cells, 0)]
        bary = np.einsum("ijk,ik->ij", transform[:, :2], xy - transform[:, 2])
        weights = np.column_stack((bary, 1 - bary.sum(axis=1)))
        predicted = (values[selected[tin.simplices[np.maximum(cells, 0)]]] * weights).sum(axis=1)
        residual = np.where(finite & (cells >= 0), abs(predicted - values), 0)
        max_error = float(residual.max())
        relative = residual / tolerance
        if relative.max() <= 1:
            break
        # Add only the worst offender in each triangle to avoid uncontrolled refinement.
        order = np.argsort(relative)[::-1]
        order = order[relative[order] > 1]
        _, first = np.unique(cells[order], return_index=True)
        keep[order[first]] = True
    else:
        raise ValueError("Adaptive terrain failed to converge")
    selected = np.flatnonzero(keep)
    vertices = np.column_stack((xy[selected], values[selected])).astype(np.float32)
    faces = tin.simplices.copy()
    centres = vertices[faces, :2].mean(axis=1)
    valid = np.isfinite(sample_grid(grid, centres[:, 0], centres[:, 1]))
    valid[np.unique(cells[(~finite) & (cells >= 0)])] = False
    valid &= vertices[faces, 2].max(axis=1) > 0.5
    if coast_bounds:
        cw, cs, ce, cn = coast_bounds
        valid &= ~(
            (centres[:, 0] > cw)
            & (centres[:, 0] < ce)
            & (centres[:, 1] > cs)
            & (centres[:, 1] < cn)
        )
    faces = faces[valid]
    # Upward winding in Blender's east/north/up frame.
    a, b, c = (vertices[faces[:, i], :2] for i in range(3))
    reverse = (b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (
        c[:, 0] - a[:, 0]
    ) < 0
    faces[reverse] = faces[reverse][:, [0, 2, 1]]
    return vertices, faces.astype(np.int32), max_error


def rasterize_mesh(vertices, faces, grid):
    """Independent triangle surface evaluation for sampled LOD horizon comparison."""
    from scipy.interpolate import LinearNDInterpolator

    # Original TIN is Delaunay; evaluate before the sea/coast face masks (analysis overlays coast).
    yy, xx = np.mgrid[: grid["height"].shape[0], : grid["height"].shape[1]]
    w, _, _, n = grid["bounds"]
    interp = LinearNDInterpolator(vertices[:, :2], vertices[:, 2])
    return {
        **grid,
        "height": interp(w + xx * grid["spacing"], n - yy * grid["spacing"]).astype(np.float32),
    }


def run(world, refresh=False):
    started = time.perf_counter()
    config = settings()
    manifest_path = ROOT.parent / "client/public/coast-assets/manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if manifest["configSha256"] != world.key or not np.allclose(
        manifest["origin"]["utm"][:2], world.origin, atol=0.001
    ):
        raise ValueError("Regional build requires the matching Phase 1/2 coastal export")
    source = RegionalSource(world, config, discover(world, config, refresh))
    size = config["tile_size_m"]
    r = config["survey_radius_m"]
    bounds = [
        math.floor((world.origin[0] - r) / size) * size,
        math.floor((world.origin[1] - r) / size) * size,
        math.ceil((world.origin[0] + r) / size) * size,
        math.ceil((world.origin[1] + r) / size) * size,
    ]
    heights, codes = source.grid(bounds, config["survey_spacing_m"])
    survey = {"bounds": bounds, "spacing": config["survey_spacing_m"], "height": heights}
    coast = coast_grid(world)
    manifest = reference_viewpoints(world, coast, manifest)
    print("Survey downloaded; computing coastal beach views", flush=True)
    report, selected, _ = analyze(world, config, manifest, [survey, coast], select=True)
    output = world.processed / "regional"
    output.mkdir(exist_ok=True)
    write_json(
        output / "selection.json",
        {
            "tiles": sorted(selected),
            "surveyBounds": bounds,
            "hrdemPixels": int((codes == 1).sum()),
            "fallbackPixels": int((codes == 2).sum()),
            "unknownPixels": int((codes == 0).sum()),
        },
    )
    grids, metadata = [], []
    pending = set(selected)
    for selection_pass in range(5):
        cw, cs, ce, cn = world.bounds
        for index, (x, y) in enumerate(sorted(pending)):
            if x >= cw and y >= cs and x + size <= ce and y + size <= cn:
                continue
            # Minimum distance from any actual beach reference position to this tile.
            distance = min(
                math.hypot(
                    max(
                        x - b["beachView"]["position"][0] - world.origin[0],
                        0,
                        b["beachView"]["position"][0] + world.origin[0] - x - size,
                    ),
                    max(
                        y + b["beachView"]["position"][2] - world.origin[1],
                        0,
                        world.origin[1] - b["beachView"]["position"][2] - y - size,
                    ),
                )
                for b in manifest["beaches"]
            )
            spacing = next((s for d, s in config["distance_bands"] if distance < d), 100)
            tile_bounds = [x, y, x + size, y + size]
            height, provenance = source.grid(tile_bounds, spacing)
            # Shared 100m edge heights make different source-processing resolutions watertight.
            # Interpolate along the same surveyed edge, not independently filtered COG borders.
            for row in [0, height.shape[0] - 1]:
                xx = np.arange(height.shape[1]) * spacing + x
                yy = np.full_like(xx, y + size - row * spacing)
                height[row] = sample_grid(survey, xx, yy)
            for col in [0, height.shape[1] - 1]:
                yy = y + size - np.arange(height.shape[0]) * spacing
                xx = np.full_like(yy, x + col * spacing)
                height[:, col] = sample_grid(survey, xx, yy)
            grids.append({"bounds": tile_bounds, "spacing": spacing, "height": height})
            metadata.append(
                {
                    "id": f"regional_{x}_{y}",
                    "bounds": tile_bounds,
                    "spacing": spacing,
                    "distance": distance,
                    "sourcePixels": {
                        "HRDEM": int((provenance == 1).sum()),
                        "MRDEM": int((provenance == 2).sum()),
                        "unknown": int((provenance == 0).sum()),
                    },
                }
            )
            print(f"DTM {index + 1}/{len(selected)} {spacing}m", flush=True)
        reference, refined, locks = analyze(
            world, config, manifest, [survey, *grids, coast], select=True
        )
        pending = refined - selected
        if not pending:
            break
        selected |= pending
        print(
            f"Visibility refinement {selection_pass + 1}: {len(pending)} additional tiles",
            flush=True,
        )
    else:
        raise ValueError("Regional visibility selection failed to converge")
    write_json(
        output / "selection.json",
        {
            "tiles": sorted(selected),
            "surveyBounds": bounds,
            "selectionPasses": selection_pass + 1,
            "hrdemPixels": int((codes == 1).sum()),
            "fallbackPixels": int((codes == 2).sum()),
            "unknownPixels": int((codes == 0).sum()),
        },
    )
    charts(reference, output / "horizons.svg")
    entries, lod_reports = [], []
    for lod, tolerance in enumerate(config["lod_height_error_m"]):
        simplified = []
        for grid, meta in zip(grids, metadata, strict=True):
            x, y, _, _ = grid["bounds"]
            vertices, faces, error = adaptive_mesh(
                grid,
                tolerance * max(1, meta["distance"] / 15000),
                locks.get((x, y), []),
                world.bounds,
                [
                    (
                        b["beachView"]["position"][0] + world.origin[0],
                        world.origin[1] - b["beachView"]["position"][2],
                    )
                    for b in manifest["beaches"]
                ],
            )
            if not len(faces):
                continue
            simplified.append(rasterize_mesh(vertices, faces, grid))
            local = vertices.copy()
            local[:, :2] -= np.array(world.origin)
            name = f"{meta['id']}-lod{lod}.npz"
            np.savez_compressed(output / name, vertices=local, faces=faces)
            entries.append(
                {
                    **meta,
                    "lod": lod,
                    "file": name,
                    "triangles": len(faces),
                    "maxHeightError": error,
                    "sourceSha256": sha256(output / name),
                }
            )
        approximation, _, _ = analyze(world, config, manifest, [*simplified, coast])
        errors = []
        for expected, actual in zip(reference["beaches"], approximation["beaches"], strict=True):
            delta = np.array(
                [
                    abs(a["angle"] - b["angle"])
                    for a, b in zip(expected["profile"], actual["profile"], strict=True)
                ]
            )
            errors.append(
                {
                    "id": expected["id"],
                    "maxDegrees": float(delta.max()),
                    "p95Degrees": float(np.percentile(delta, 95)),
                }
            )
        lod_reports.append({"lod": lod, "beaches": errors})
    result = {
        "version": 1,
        "config": config,
        "worldConfigSha256": world.key,
        "origin": manifest["origin"],
        "tiles": entries,
        "coverage": metadata,
        "lodValidation": lod_reports,
        "seconds": round(time.perf_counter() - started, 2),
        "sources": "regional-sources.json",
        "surveyBounds": bounds,
    }
    # Fail rather than publish a known distorted horizon.
    result["horizonPass"] = all(
        b["maxDegrees"] <= config["horizon_tolerance_degrees"]
        for lod_report in lod_reports
        for b in lod_report["beaches"]
    )
    write_json(output / "regional.json", result)
    write_json(world.metadata / "latest-regional-build.json", result)
    if not result["horizonPass"]:
        raise ValueError("LOD horizon error exceeded budget; see latest-regional-build.json")
    return output
