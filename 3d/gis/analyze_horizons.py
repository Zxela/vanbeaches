"""Observer-relative curved-earth terrain rays, shared by selection and LOD validation."""

import math

import numpy as np
from scipy.ndimage import map_coordinates

from .common import write_json


def curvature_drop(distance, radius):
    return np.asarray(distance) ** 2 / (2 * radius) if radius else np.asarray(distance) * 0


def sample_grid(grid, x, y):
    w, _, _, n = grid["bounds"]
    spacing = grid["spacing"]
    return map_coordinates(
        grid["height"],
        [(n - y) / spacing, (x - w) / spacing],
        order=1,
        mode="constant",
        cval=np.nan,
        prefilter=False,
    )


def sample(grids, x, y):
    result = np.full(np.shape(x), np.nan, np.float32)
    for grid in grids:
        w, s, e, n = grid["bounds"]
        inside = (x >= w) & (x <= e) & (y >= s) & (y <= n)
        if inside.any():
            values = sample_grid(grid, x[inside], y[inside])
            old = result[inside]
            result[inside] = np.where(np.isfinite(values), values, old)
    return result


class TerrainSampler:
    """Index disjoint regional tiles so each ray visits crossed tiles, not the whole AOI."""

    def __init__(self, grids, size):
        self.size = size
        indices = [
            i
            for i, g in enumerate(grids)
            if g["bounds"][2] - g["bounds"][0] == size and g["bounds"][3] - g["bounds"][1] == size
        ]
        self.tiles = {}
        self.before, self.after = grids, []
        if indices:
            self.before, self.after = grids[: indices[0]], grids[indices[-1] + 1 :]
            for i in indices:
                g = grids[i]
                self.tiles[int(g["bounds"][0] // size) * 1000000 + int(g["bounds"][1] // size)] = g

    def __call__(self, x, y):
        result = sample(self.before, x, y)
        keys = np.floor(x / self.size).astype(np.int64) * 1000000 + np.floor(y / self.size).astype(
            np.int64
        )
        for key in np.unique(keys):
            grid = self.tiles.get(key)
            if grid is None:
                continue
            inside = keys == key
            z = sample_grid(grid, x[inside], y[inside])
            result[inside] = np.where(np.isfinite(z), z, result[inside])
        edge = (np.abs(x / self.size - np.round(x / self.size)) < 1e-9) | (
            np.abs(y / self.size - np.round(y / self.size)) < 1e-9
        )
        if edge.any():
            z = sample(list(self.tiles.values()), x[edge], y[edge])
            result[edge] = np.where(np.isfinite(z), z, result[edge])
        foreground = sample(self.after, x, y)
        return np.where(np.isfinite(foreground), foreground, result)


def analyze(world, config, manifest, grids, select=False):
    radius = config["earth_radius_m"] if config["curvature"] else 0
    distances = np.arange(config["ray_step_m"], config["survey_radius_m"] + 1, config["ray_step_m"])
    azimuths = np.arange(0, 360, config["azimuth_step_degrees"])
    selected, locks, beaches = set(), {}, []
    size = config["tile_size_m"]
    sampler = TerrainSampler(grids, size)
    for beach in manifest["beaches"]:
        pose = beach.get("beachView")
        if not pose:
            raise ValueError(f"Missing actual beach camera: {beach['id']}")
        px, pz, south = pose["position"]
        px += world.origin[0]
        py = world.origin[1] - south
        profile, missing, diagnostic_rays = [], 0, []
        for azimuth in azimuths:
            angle = math.radians(azimuth)
            x, y = px + np.sin(angle) * distances, py + np.cos(angle) * distances
            z = sampler(x, y)
            apparent = np.degrees(np.arctan2(z - pz - curvature_drop(distances, radius), distances))
            # Ocean horizon also occludes distant low land. No atmospheric refraction assumed.
            baseline = -math.degrees(math.sqrt(max(0, 2 * pz / radius))) if radius else 0
            valid = np.isfinite(z)
            missing += int((~valid).sum())
            angles = np.where(valid, apparent, -90)
            prior = np.maximum.accumulate(np.r_[baseline, angles[:-1]])
            visible = valid & (z > 1) & (angles > prior)
            candidates = np.where(visible)[0]
            if azimuth % 10 == 0:
                diagnostic_rays.append(
                    [
                        {
                            "visible": bool(visible[i]),
                            "point": [
                                float(x[i] - world.origin[0]),
                                float(z[i]),
                                float(world.origin[1] - y[i]),
                            ],
                        }
                        for i in range(0, len(distances), 10)
                        if valid[i] and z[i] > 1
                    ]
                )
            if len(candidates):
                winner = candidates[np.argmax(angles[candidates])]
                profile.append(
                    {
                        "azimuth": float(azimuth),
                        "angle": float(angles[winner]),
                        "distance": float(distances[winner]),
                        "elevation": float(z[winner]),
                        "point": [
                            float(x[winner] - world.origin[0]),
                            float(z[winner]),
                            float(world.origin[1] - y[winner]),
                        ],
                        "visibleSamples": int(len(candidates)),
                        "occludedSamples": int((valid & (z > 1) & ~visible).sum()),
                    }
                )
                if select:
                    for i in candidates:
                        key = (int(x[i] // size) * size, int(y[i] // size) * size)
                        selected.add(key)
                    # Preserve true skyline samples and their neighbours in both LODs.
                    key = (int(x[winner] // size) * size, int(y[winner] // size) * size)
                    locks.setdefault(key, []).append((float(x[winner]), float(y[winner])))
            else:
                profile.append(
                    {
                        "azimuth": float(azimuth),
                        "angle": baseline,
                        "distance": None,
                        "elevation": None,
                        "point": None,
                        "visibleSamples": 0,
                        "occludedSamples": int((valid & (z > 1)).sum()),
                    }
                )
        target = pose["target"]
        heading = (
            math.degrees(math.atan2(target[0] - pose["position"][0], -(target[2] - south))) % 360
        )
        beaches.append(
            {
                "id": beach["id"],
                "position": pose["position"],
                "heading": heading,
                "profile": profile,
                "unknownRaySamples": missing,
                "diagnosticRays": diagnostic_rays,
            }
        )
    return (
        {
            "beaches": beaches,
            "azimuthStep": config["azimuth_step_degrees"],
            "rayStepMetres": config["ray_step_m"],
            "earthRadiusMetres": radius,
            "refraction": "none; geometric horizon",
            "coverage": "Terrain-only, no trees or buildings",
        },
        selected,
        locks,
    )


def charts(report, path):
    """Standalone SVG: clockwise grid-north azimuth and labelled angular scales."""
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1390" viewBox="0 0 1440 1390">',
        '<rect width="1440" height="1390" fill="#10212c"/>',
        "<style>text{fill:#cbdce3;font:13px sans-serif} .grid{stroke:#38505e;stroke-width:1}</style>",
    ]
    for i, beach in enumerate(report["beaches"]):
        ox, oy = 65 + (i % 2) * 710, 55 + (i // 2) * 270
        maximum = max(10, math.ceil(max(p["angle"] for p in beach["profile"]) / 5) * 5)
        scale = 200 / maximum
        parts.append(
            f'<text x="{ox}" y="{oy - 20}">{beach["id"]} — heading {beach["heading"]:.1f}°</text>'
        )
        for az in range(0, 361, 90):
            x = ox + az / 360 * 630
            parts.append(
                f'<path class="grid" d="M{x},{oy}v210"/><text x="{x}" y="{oy + 230}">{az}°</text>'
            )
        for a in np.linspace(0, maximum, 5):
            yy = oy + 200 - a * scale
            parts.append(
                f'<path class="grid" d="M{ox},{yy}h630"/><text x="{ox - 38}" y="{yy}">{a:g}°</text>'
            )
        points = " ".join(
            f"{ox + p['azimuth'] / 360 * 630:.1f},{oy + 200 - p['angle'] * scale:.1f}"
            for p in beach["profile"]
        )
        parts.append(
            f'<polyline fill="none" stroke="#86d7b1" stroke-width="1.5" points="{points}"/>'
        )
    parts.append("</svg>")
    path.write_text("\n".join(parts), encoding="utf-8")
    write_json(path.with_suffix(".json"), report)
