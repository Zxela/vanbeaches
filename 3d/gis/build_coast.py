"""Conservative fusion, source masks, tiled NPZ geometry and LOD seam handling."""

import json
import math

import numpy as np
import rasterio
from rasterio.windows import Window
from scipy import ndimage
from scipy.interpolate import LinearNDInterpolator

from gis.beaches import destinations
from gis.common import save_raster, write_json

LIDAR, NONNA, INTERPOLATED, METRO = 1, 2, 3, 4


def fill_small_gaps(z, source, spacing, settings):
    """Fill only bounded, small, gentle holes; never extrapolate across open coverage."""
    labels, number = ndimage.label(~np.isfinite(z))
    objects = ndimage.find_objects(labels)
    filled = 0
    for label, bounds in enumerate(objects, 1):
        if bounds is None:
            continue
        rows, cols = bounds
        # Exterior gaps include missing surveys and unknown land; keep them open.
        if rows.start == 0 or cols.start == 0 or rows.stop == z.shape[0] or cols.stop == z.shape[1]:
            continue
        area = (labels[bounds] == label).sum() * spacing**2
        if area > settings["max_gap_area_m2"]:
            continue
        view = np.s_[rows.start - 1 : rows.stop + 1, cols.start - 1 : cols.stop + 1]
        hole = labels[view] == label
        distance = ndimage.distance_transform_edt(hole) * spacing
        if distance.max() > settings["max_gap_distance_m"]:
            continue
        ring = ndimage.binary_dilation(hole) & np.isfinite(z[view])
        points = np.argwhere(ring)
        if len(points) < 3:
            continue
        missing = np.argwhere(hole)
        interpolator = LinearNDInterpolator(points, z[view][ring])
        values = interpolator(missing)
        if not np.all(np.isfinite(values)):
            continue
        candidate = z[view].copy()
        candidate[hole] = values
        # Test slopes incident on a filled node without NaNs from unrelated gaps.
        dx = np.abs(np.diff(candidate, axis=1)) / spacing
        dy = np.abs(np.diff(candidate, axis=0)) / spacing
        incident_x, incident_y = hole[:, :-1] | hole[:, 1:], hole[:-1] | hole[1:]
        if (
            max(np.nanmax(dx[incident_x], initial=0), np.nanmax(dy[incident_y], initial=0))
            > settings["max_transition_slope"]
        ):
            continue
        z[view][hole] = values
        source[view][hole] = INTERPOLATED
        filled += int(hole.sum())
    return filled


def fuse(land, bathy, spacing, settings, supplemental=None):
    z = np.where(np.isfinite(land), land, bathy).astype(np.float32)
    source = np.where(np.isfinite(land), LIDAR, np.where(np.isfinite(bathy), NONNA, 0)).astype(
        np.uint8
    )
    if supplemental is not None:
        use_secondary = ~np.isfinite(z) & np.isfinite(supplemental)
        z[use_secondary] = supplemental[use_secondary]
        source[use_secondary] = METRO
    overlap = np.isfinite(land) & np.isfinite(bathy)
    discrepancy = np.abs(land[overlap] - bathy[overlap])
    fill_small_gaps(z, source, spacing, settings)
    return (
        z,
        source,
        {
            "overlap_nodes": int(overlap.sum()),
            "overlap_conflicts": int((discrepancy > settings["overlap_warning_m"]).sum()),
            "overlap_p95_m": float(np.percentile(discrepancy, 95)) if discrepancy.size else None,
        },
    )


def mesh_arrays(z, source, spacing):
    """CCW upward faces; a missing corner removes the face, never bridges a hole."""
    rows, cols = z.shape
    y, x = np.indices(z.shape)
    vertices = np.column_stack(
        (x.ravel() * spacing, -y.ravel() * spacing, np.nan_to_num(z).ravel())
    ).astype(np.float32)
    a = np.arange(rows * cols).reshape(z.shape)[:-1, :-1].ravel()
    b, c, d = a + 1, a + cols, a + cols + 1
    triangles = np.concatenate((np.column_stack((a, c, b)), np.column_stack((b, c, d))))
    valid = np.isfinite(z).ravel()
    triangles = triangles[np.all(valid[triangles], axis=1)]
    if not len(triangles):
        return vertices[:0], triangles.astype(np.int32), np.zeros(0, dtype=np.uint8)
    codes = source.ravel()[triangles]
    face_source = np.where(
        np.all(codes == LIDAR, axis=1),
        LIDAR,
        np.where(
            np.all(codes == NONNA, axis=1),
            NONNA,
            np.where(np.all(codes == METRO, axis=1), METRO, INTERPOLATED),
        ),
    ).astype(np.uint8)
    used, inverse = np.unique(triangles, return_inverse=True)
    return vertices[used], inverse.reshape(-1, 3).astype(np.int32), face_source


def mesh_product(z, source, spacing, settings):
    """Do not invent steep walls by connecting incompatible source elevations.

    Measured same-source cliffs survive. Rejected triangles remain in the product
    for debug inspection, with their original vertices/elevations unchanged.
    """
    vertices, faces, codes = mesh_arrays(z, source, spacing)
    node_sources = source[
        np.rint(-vertices[:, 1] / spacing).astype(int),
        np.rint(vertices[:, 0] / spacing).astype(int),
    ]
    rejected = np.zeros(len(faces), dtype=bool)
    for first, second in ((0, 1), (1, 2), (2, 0)):
        a, b = faces[:, first], faces[:, second]
        mixed = (
            (node_sources[a] != node_sources[b])
            & np.isin(node_sources[a], [LIDAR, NONNA, METRO])
            & np.isin(node_sources[b], [LIDAR, NONNA, METRO])
        )
        difference = np.abs(vertices[a, 2] - vertices[b, 2])
        distance = np.linalg.norm(vertices[a, :2] - vertices[b, :2], axis=1)
        rejected |= (
            mixed
            & (difference > settings["max_source_join_step_m"])
            & (difference > distance * settings["max_source_join_slope"])
        )
    return vertices, faces[~rejected], codes[~rejected], faces[rejected]


def stitch_edges(z, source, coarse_z, coarse_source, ratio):
    """Fine boundary vertices lie on the exact coarse edge polyline (no cracks)."""
    for fine_edge, fine_source, edge, edge_source in (
        (z[0], source[0], coarse_z[0], coarse_source[0]),
        (z[-1], source[-1], coarse_z[-1], coarse_source[-1]),
        (z[:, 0], source[:, 0], coarse_z[:, 0], coarse_source[:, 0]),
        (z[:, -1], source[:, -1], coarse_z[:, -1], coarse_source[:, -1]),
    ):
        for index in range(len(edge) - 1):
            start = index * ratio
            if np.isfinite(edge[index : index + 2]).all():
                fine_edge[start : start + ratio + 1] = np.linspace(
                    edge[index], edge[index + 1], ratio + 1
                )
                fine_source[start : start + ratio + 1] = INTERPOLATED
            else:
                fine_edge[start : start + ratio + 1] = np.nan
                fine_source[start : start + ratio + 1] = 0
        fine_edge[::ratio] = edge
        fine_source[::ratio] = edge_source


def beach_camera_anchor(world, land, coast, spanish):
    """Measured gentle dry ground beside the high-tide contour, near the canonical beach."""
    coarse = world.config["processing"]["overview_spacing_m"]
    fine = world.config["processing"]["coastal_spacing_m"]
    sx, sy = world.project.transform(spanish["longitude"], spanish["latitude"])
    yy, xx = np.indices(land.shape)
    x, y = world.bounds[0] + xx * coarse, world.bounds[3] - yy * coarse
    distance = (x - sx) ** 2 + (y - sy) ** 2
    high_water = (
        max(world.config["water"]["tide_test_states_cd_m"])
        + world.config["vertical"]["chart_datum_offset_m"]
    )
    coast_distance = ndimage.distance_transform_edt(~(coast < high_water)) * coarse
    gy, gx = np.gradient(land, coarse)
    candidate = (
        (land >= high_water + 0.25)
        & (land <= high_water + 1.5)
        & (distance <= 750**2)
        & (coast_distance <= 20)
        & (np.hypot(gx, gy) < 0.1)
        & (ndimage.minimum_filter(np.isfinite(land).astype(np.uint8), size=5) > 0)
    )
    anchor = {"local_ground_position": spanish["worldPosition"], "status": "destination_fallback"}
    if candidate.any():
        row, col = np.unravel_index(np.argmin(np.where(candidate, distance, np.inf)), land.shape)
        # Use the local maximum of prepared fine ground to clear its visible surface.
        with rasterio.open(world.processed / f"land-{fine}m.tif") as dataset:
            fr, fc = dataset.index(x[row, col], y[row, col])
            neighbourhood = dataset.read(1, window=Window(fc - 1, fr - 1, 3, 3))
        height = max(float(land[row, col]), float(np.nanmax(neighbourhood)))
        anchor = {
            "local_ground_position": [
                float(x[row, col] - world.origin[0]),
                float(y[row, col] - world.origin[1]),
                height,
            ],
            "status": "measured_lidar_near_destination",
            "destination_id": spanish["id"],
            "geographic_position": list(world.unproject.transform(x[row, col], y[row, col])),
        }
    return anchor


def build(world, allow_partial=False):
    processing = json.loads((world.processed / "processing.json").read_text())
    if not processing["source_acquisition_complete"] and not allow_partial:
        raise ValueError("Incomplete sources; use --allow-partial only for inspection")
    p = world.config["processing"]
    coarse, fine, size = p["overview_spacing_m"], p["coastal_spacing_m"], p["tile_size_m"]
    if coarse % fine:
        raise ValueError("Overview spacing must be an integer multiple of coastal spacing")
    with rasterio.open(world.processed / f"land-{coarse}m.tif") as ds:
        land = ds.read(1)
    with rasterio.open(world.processed / f"bathymetry-{coarse}m.tif") as ds:
        bathy = ds.read(1)
    supplemental = None
    if processing["supplemental_ground"]["accepted"]:
        with rasterio.open(world.processed / f"metro-ground-{coarse}m.tif") as ds:
            supplemental = ds.read(1)
    z, provenance, overlaps = fuse(land, bathy, coarse, p, supplemental)
    save_raster(world, world.processed / "coast.tif", z, coarse, vertical_datum="CGVD28GVRD")
    save_raster(
        world,
        world.processed / "provenance.tif",
        provenance,
        coarse,
        codes="0=MISSING,1=LIDAR,2=NONNA,3=INTERPOLATED,4=METRO_LIDAR_2022",
    )
    lower, upper = p["coastal_elevation_band_m"]
    # Do not refine primary bathymetry because unrelated aerial returns exist above it.
    candidate_land = np.where((provenance == LIDAR) | (provenance == METRO), z, np.nan)
    coast = (candidate_land >= lower) & (candidate_land <= upper)
    near_coast = (
        ndimage.distance_transform_edt(~coast) * coarse <= p["coastal_distance_m"]
        if coast.any()
        else coast
    )
    tiles_dir = world.processed / "tiles"
    tiles_dir.mkdir(exist_ok=True)
    tiles = []
    step = int(size / coarse)
    halo = math.ceil(p["max_gap_distance_m"] / fine) + 2
    with rasterio.open(world.processed / f"land-{fine}m.tif") as fine_land:
        for row in range(0, z.shape[0] - 1, step):
            for col in range(0, z.shape[1] - 1, step):
                coarse_slice = np.s_[row : row + step + 1, col : col + step + 1]
                overview, overview_source = z[coarse_slice], provenance[coarse_slice]
                if not np.isfinite(overview).any():
                    continue
                use_fine = bool(near_coast[coarse_slice].any())
                levels = [("overview", coarse, overview, overview_source)]
                if use_fine:
                    ratio = int(coarse / fine)
                    length = step * ratio + 1
                    start_row, start_col = row * ratio, col * ratio
                    raw = fine_land.read(
                        1,
                        window=Window(
                            start_col - halo, start_row - halo, length + 2 * halo, length + 2 * halo
                        ),
                        boundless=True,
                        fill_value=np.nan,
                    )
                    # Interpolate only inside valid 10m NONNA grid cells. NaN propagation
                    # prevents interpolation across a missing measurement footprint.
                    yy, xx = np.indices(raw.shape, dtype=float)
                    coords = [(start_row - halo + yy) / ratio, (start_col - halo + xx) / ratio]
                    sampled_bathy = ndimage.map_coordinates(
                        bathy, coords, order=1, mode="constant", cval=np.nan, prefilter=False
                    )
                    supplemental_fine = None
                    if supplemental is not None:
                        with rasterio.open(world.processed / f"metro-ground-{fine}m.tif") as ds:
                            supplemental_fine = ds.read(
                                1,
                                window=Window(
                                    start_col - halo,
                                    start_row - halo,
                                    length + 2 * halo,
                                    length + 2 * halo,
                                ),
                                boundless=True,
                                fill_value=np.nan,
                            )
                    high_z, high_source, _ = fuse(raw, sampled_bathy, fine, p, supplemental_fine)
                    high_z = high_z[halo : halo + length, halo : halo + length].copy()
                    high_source = high_source[halo : halo + length, halo : halo + length].copy()
                    stitch_edges(high_z, high_source, overview, overview_source, ratio)
                    levels.append(("coastal", fine, high_z, high_source))
                for lod, spacing, heights, codes in levels:
                    vertices, faces, face_sources, rejected = mesh_product(
                        heights, codes, spacing, p
                    )
                    if not len(faces):
                        continue
                    x, y = world.bounds[0] + col * coarse, world.bounds[3] - row * coarse
                    name = f"tile_{int(x)}_{int(y - size)}_{lod}"
                    path = tiles_dir / f"{name}.npz"
                    np.savez_compressed(
                        path,
                        vertices=vertices,
                        faces=faces,
                        source=face_sources,
                        rejected_source_joins=rejected,
                    )
                    bounds = [x, y - size, x + size, y]
                    tiles.append(
                        {
                            "id": name,
                            "file": str(path.relative_to(world.processed)),
                            "lod": lod,
                            "active": lod == ("coastal" if use_fine else "overview"),
                            "spacing_m": spacing,
                            "projected_bounds": bounds,
                            "geographic_bounds": list(world.unproject.transform_bounds(*bounds)),
                            "local_transform": [x - world.origin[0], y - world.origin[1], 0],
                            "vertices": len(vertices),
                            "faces": len(faces),
                            "rejected_source_join_faces": len(rejected),
                            "source_counts": {
                                str(i): int((face_sources == i).sum()) for i in (1, 2, 3, 4)
                            },
                            "source_resolution": {
                                "lidar_ground_grid_m": fine,
                                "nonna_nominal_m": world.config["sources"]["bathymetry"][
                                    "nominal_resolution_m"
                                ],
                                "nonna_note": "WCS grid ~12.5m locally; finer sampling adds no accuracy",
                                "metro_ground_grid_m": fine if supplemental is not None else None,
                            },
                        }
                    )
    beach_data = destinations(world)
    for beach in beach_data["beaches"]:
        x, y = world.project.transform(beach["longitude"], beach["latitude"])
        col, row = round((x - world.bounds[0]) / coarse), round((world.bounds[3] - y) / coarse)
        if (
            beach["inside_aoi"]
            and 0 <= row < z.shape[0]
            and 0 <= col < z.shape[1]
            and np.isfinite(z[row, col])
        ):
            beach["worldPosition"][2] = float(z[row, col])
            beach["position_z_status"] = {
                1: "LIDAR",
                2: "NONNA",
                3: "INTERPOLATED",
                4: "METRO_LIDAR_2022",
            }[int(provenance[row, col])]
        else:
            beach["position_z_status"] = (
                "missing_coverage" if beach["inside_aoi"] else "outside_aoi"
            )
    write_json(world.processed / "beaches.json", beach_data)
    # Derive a low camera anchor from measured, locally complete dry ground. The
    # canonical beach coordinate may be on an inland bluff; do not move that record.
    spanish = next(b for b in beach_data["beaches"] if b["id"] == "spanish-banks")
    anchor = beach_camera_anchor(world, land, z, spanish)
    result = {
        "config": world.config,
        "config_sha256": world.key,
        "source_acquisition_complete": processing["source_acquisition_complete"],
        "status": "unvalidated"
        if processing["source_acquisition_complete"]
        else "INCOMPLETE_SOURCE_COVERAGE",
        "origin_projected": [*world.origin, 0],
        "projected_bounds": list(world.bounds),
        "axis_convention": "X east, Y north, Z up; metres",
        "tiles": tiles,
        "source_codes": {"1": "LIDAR", "2": "NONNA", "3": "INTERPOLATED", "4": "METRO_LIDAR_2022"},
        "overlap": overlaps,
        "beaches": beach_data,
        "camera_anchors": {"spanish_banks_beach": anchor},
        "missing_files": processing["missing_files"],
        "coverage_nodes": {str(i): int((provenance == i).sum()) for i in (0, 1, 2, 3, 4)},
        "non_navigation": True,
        "source_processing_metadata": processing,
    }
    write_json(world.processed / "world.json", result)
    print(f"Built {len(tiles)} LOD tile products; {result['status']}", flush=True)
    return result
