"""Named investigation windows and beach-specific, measured horizon summaries.

Windows are approximate geographic labels for reporting, never geometry constraints.
"""

import json

import numpy as np

from .common import write_json
from .fetch_regional_dem import RegionalSource, discover

REGIONS = {
    "North Shore / north of Burrard Inlet": [-123.32, 49.32, -122.82, 49.50],
    "Cypress / Hollyburn": [-123.27, 49.36, -123.15, 49.43],
    "Grouse and neighbouring ridges": [-123.15, 49.35, -123.03, 49.44],
    "Mount Seymour": [-123.03, 49.34, -122.90, 49.43],
    "Indian Arm approaches": [-122.94, 49.31, -122.81, 49.47],
    "Howe Sound approaches": [-123.51, 49.33, -123.23, 49.59],
    "Bowen Island": [-123.45, 49.32, -123.30, 49.43],
    "Point Grey / UBC (coast has priority)": [-123.28, 49.245, -123.21, 49.29],
    "Western terrain / Strait, Sunshine Coast, Vancouver Island": [-125.1, 48.5, -123.5, 49.7],
}


def validate(world):
    from .analyze_horizons import sample_grid
    from .preprocess_regional_dem import coast_grid

    base = world.processed / "regional"
    report = json.loads((base / "regional.json").read_text())
    profiles = json.loads((base / "horizons.json").read_text())
    source = RegionalSource(world, report["config"], discover(world, report["config"]))
    coastal = coast_grid(world)
    comparison, codes = source.grid(list(world.bounds), 50)
    yy, xx = np.mgrid[: comparison.shape[0], : comparison.shape[1]]
    detailed = sample_grid(coastal, world.bounds[0] + xx * 50, world.bounds[3] - yy * 50)
    valid = (
        np.isfinite(detailed)
        & np.isfinite(comparison)
        & (codes == 1)
        & (detailed > 3)
        & (comparison > 3)
    )
    delta = comparison[valid] - detailed[valid]
    overlap = {
        "samples": len(delta),
        "medianRegionalMinusCoastMetres": float(np.median(delta)) if len(delta) else None,
        "p95AbsoluteMetres": float(np.percentile(abs(delta), 95)) if len(delta) else None,
        "note": "50m resampled HRDEM versus 10m fused coast, dry ground. Agreement check, not datum certification.",
    }
    regions = []
    for name, ll in REGIONS.items():
        w, s, e, n = world.project.transform_bounds(*ll, densify_pts=21)
        counts = np.zeros(3, dtype=np.int64)
        tiles = []
        for tile in report["coverage"]:
            tw, ts, te, tn = tile["bounds"]
            if te < w or tw > e or tn < s or ts > n:
                continue
            _, codes = source.grid(tile["bounds"], tile["spacing"])
            yy, xx = np.mgrid[: codes.shape[0], : codes.shape[1]]
            inside = (
                (xx * tile["spacing"] + tw >= w)
                & (xx * tile["spacing"] + tw <= e)
                & (tn - yy * tile["spacing"] >= s)
                & (tn - yy * tile["spacing"] <= n)
            )
            counts += np.bincount(codes[inside], minlength=3) * tile["spacing"] ** 2
            tiles.append(tile["id"])
        views = []
        for beach in profiles["beaches"]:
            points = [
                p
                for p in beach["profile"]
                if p["point"]
                and w <= p["point"][0] + world.origin[0] <= e
                and s <= world.origin[1] - p["point"][2] <= n
            ]
            if points:
                views.append(
                    {
                        "beach": beach["id"],
                        "horizonRays": len(points),
                        "azimuths": [p["azimuth"] for p in points],
                        "maxAngleDegrees": max(p["angle"] for p in points),
                        "nearestHorizonMetres": min(p["distance"] for p in points),
                    }
                )
        regions.append(
            {
                "name": name,
                "approximateInvestigationBounds": ll,
                "selectedTiles": tiles,
                "sampleAreaFractions": dict(
                    zip(
                        ["unknown", "HRDEM", "MRDEM"],
                        (counts / max(1, counts.sum())).tolist(),
                        strict=True,
                    )
                ),
                "horizonContributions": views,
            }
        )
    result = {
        "coastalVerticalOverlap": overlap,
        "regions": regions,
        "note": "Overlapping diagnostic windows, not official feature boundaries. No visible horizon rays means obscured or below another skyline, not missing DEM.",
        "beaches": [
            {
                "id": b["id"],
                "position": b["position"],
                "heading": b["heading"],
                "mainViewMaximumAngle": max(
                    p["angle"]
                    for p in b["profile"]
                    if abs((p["azimuth"] - b["heading"] + 180) % 360 - 180) < 30
                ),
                "farthestHorizonMetres": max(p["distance"] or 0 for p in b["profile"]),
            }
            for b in profiles["beaches"]
        ],
    }
    write_json(world.metadata / "latest-regional-validation.json", result)
    return result
