"""Numerical acceptance evidence. Missing sources cannot be reported as a complete world."""

import json

import numpy as np
import rasterio
from scipy import ndimage

from gis.common import write_json


def validate(world):
    manifest = json.loads((world.processed / "world.json").read_text())
    with rasterio.open(world.processed / "coast.tif") as dataset:
        z, transform = dataset.read(1), dataset.transform
    with rasterio.open(world.processed / "provenance.tif") as dataset:
        source = dataset.read(1)
    valid = np.isfinite(z)
    config = world.config
    spacing = config["processing"]["overview_spacing_m"]
    with rasterio.open(world.processed / f"land-{spacing}m.tif") as dataset:
        land = dataset.read(1)
    with rasterio.open(world.processed / f"bathymetry-{spacing}m.tif") as dataset:
        bathy = dataset.read(1)
    from gis.audit import review

    with rasterio.open(world.processed / "nonna-normalized.tif") as dataset:
        source_review = review(world, manifest, z, land, bathy, dataset.read(1), transform)
    overlap = np.isfinite(land) & np.isfinite(bathy)
    indices = np.argwhere(overlap)
    differences = land[overlap] - bathy[overlap]
    conflict_samples = []
    for index in np.argsort(np.abs(differences))[-20:][::-1]:
        if abs(differences[index]) <= config["processing"]["overlap_warning_m"]:
            continue
        row, col = indices[index]
        x, y = transform * (float(col) + 0.5, float(row) + 0.5)
        lon, lat = world.unproject.transform(x, y)
        conflict_samples.append(
            {
                "longitude": lon,
                "latitude": lat,
                "local_xy": [x - world.origin[0], y - world.origin[1]],
                "lidar_z_m": float(land[row, col]),
                "nonna_z_m": float(bathy[row, col]),
                "difference_m": float(differences[index]),
            }
        )
    structural = bool(valid.any() and np.all(np.isin(source, [0, 1, 2, 3, 4])))
    structural &= bool(np.array_equal(valid, source > 0))
    primary_preserved = bool(
        np.array_equal(z[source == 1], land[source == 1])
        and np.array_equal(z[source == 2], bathy[source == 2])
    )
    secondary = config["sources"]["supplemental_ground"]
    cutoff = (
        max(config["water"]["tide_test_states_cd_m"])
        + config["vertical"]["chart_datum_offset_m"]
        + secondary["minimum_height_above_high_tide_m"]
    )
    secondary_safe = bool(np.all(z[source == 4] > cutoff))
    if (source == 4).any():
        secondary_safe &= manifest["source_processing_metadata"]["supplemental_ground"]["accepted"]
    structural &= primary_preserved and secondary_safe
    lo, hi = config["validation"]["plausible_z_range_m"]
    range_ok = bool(valid.any() and z[valid].min() >= lo and z[valid].max() <= hi)
    structural &= range_ok
    locations = {b["id"]: b for b in manifest["beaches"]["beaches"]}
    coastal_ids = [
        key for key in locations if key not in config["validation"]["inland_destination_ids"]
    ]
    order = ["spanish-banks", "locarno-beach", "jericho-beach", "kitsilano-beach"]
    xs = [locations[key]["worldPosition"][0] for key in order]
    orientation = {
        "west_to_east_beach_order": bool(np.all(np.diff(xs) > 0)),
        "stanley_north_of_kitsilano": locations["third-beach"]["worldPosition"][1]
        > locations["kitsilano-beach"]["worldPosition"][1],
        "coastal_destinations_inside": all(locations[key]["inside_aoi"] for key in coastal_ids),
    }
    for landmark in config["validation"]["landmarks"]:
        x, y, _ = world.local(landmark["longitude"], landmark["latitude"])
        lon, lat = world.geographic(x, y)
        orientation[landmark["name"] + "_inside"] = world.inside(lon, lat)
        orientation[landmark["name"] + "_roundtrip"] = (
            abs(lon - landmark["longitude"]) < 1e-8 and abs(lat - landmark["latitude"]) < 1e-8
        )
    structural &= all(orientation.values())
    check = config["validation"]["bathymetry_check"]
    sample = {"name": check["name"], "status": "missing_coverage", "world_z_m": None}
    if world.inside(check["longitude"], check["latitude"]):
        with rasterio.open(world.processed / f"bathymetry-{spacing}m.tif") as dataset:
            point = world.project.transform(check["longitude"], check["latitude"])
            height = float(next(dataset.sample([point]))[0])
        if np.isfinite(height):
            lower, upper = check["expected_world_z_m"]
            sample.update(world_z_m=height, status="pass" if lower <= height <= upper else "FAIL")
            structural &= sample["status"] == "pass"
    tile_errors = []
    for tile in manifest["tiles"]:
        with np.load(world.processed / tile["file"]) as mesh:
            vertices, faces = mesh["vertices"], mesh["faces"]
            if not np.isfinite(vertices).all() or faces.min() < 0 or faces.max() >= len(vertices):
                tile_errors.append(tile["id"] + ": invalid mesh indices or coordinates")
            normals = np.cross(
                vertices[faces[:, 1]] - vertices[faces[:, 0]],
                vertices[faces[:, 2]] - vertices[faces[:, 0]],
            )
            if not np.all(normals[:, 2] > 0):
                tile_errors.append(tile["id"] + ": inverted face")
            if len(vertices) > config["processing"]["max_vertices_per_tile"]:
                tile_errors.append(tile["id"] + ": vertex budget exceeded")
    structural &= not tile_errors
    yy, xx = np.indices(z.shape)
    spanish = locations["spanish-banks"]
    sx, sy = world.project.transform(spanish["longitude"], spanish["latitude"])
    x = transform.c + (xx + 0.5) * spacing
    y = transform.f - (yy + 0.5) * spacing
    region = (x - sx) ** 2 + (y - sy) ** 2 <= config["validation"]["spanish_banks_radius_m"] ** 2
    # Report measured/interpolated separately, without asserting an engineered 1km retreat.
    states = []
    for tide in config["water"]["tide_test_states_cd_m"]:
        level = tide + config["vertical"]["chart_datum_offset_m"]
        states.append(
            {
                "tide_cd_m": tide,
                "water_z_m": level,
                "spanish_banks_known_submerged_m2": int(
                    (region & valid & (z < level)).sum() * spacing**2
                ),
                "spanish_banks_interpolated_submerged_m2": int(
                    (region & (source == 3) & (z < level)).sum() * spacing**2
                ),
            }
        )
    areas = [state["spanish_banks_known_submerged_m2"] for state in states]
    intertidal_supported = bool(areas[-1] > areas[0])
    transects = []
    settings = config["validation"]["spanish_banks_transects"]
    distances = np.arange(0, settings["length_m"] + 1, settings["sample_spacing_m"])
    with rasterio.open(world.processed / "coast.tif") as dataset:
        for offset in settings["east_offsets_m"]:
            heights = np.array(
                [
                    value[0]
                    for value in dataset.sample(
                        [(sx + offset, sy + distance) for distance in distances]
                    )
                ]
            )
            missing = int((~np.isfinite(heights)).sum())
            crossings = []
            for state in states:
                level = state["water_z_m"]
                indices = np.where(
                    np.isfinite(heights[:-1])
                    & np.isfinite(heights[1:])
                    & (heights[:-1] >= level)
                    & (heights[1:] < level)
                )[0]
                distance = None
                if not missing and len(indices) == 1:
                    index = indices[0]
                    fraction = (level - heights[index]) / (heights[index + 1] - heights[index])
                    distance = float(distances[index] + fraction * settings["sample_spacing_m"])
                crossings.append(
                    {"tide_cd_m": state["tide_cd_m"], "shoreline_north_of_destination_m": distance}
                )
            low = min(crossings, key=lambda item: item["tide_cd_m"])[
                "shoreline_north_of_destination_m"
            ]
            high = max(crossings, key=lambda item: item["tide_cd_m"])[
                "shoreline_north_of_destination_m"
            ]
            transects.append(
                {
                    "east_offset_m": offset,
                    "missing_samples": missing,
                    "crossings": crossings,
                    "shoreline_shift_m": low - high
                    if low is not None and high is not None
                    else None,
                }
            )
    # Detect source-boundary discontinuities rather than smoothing measured disagreements away.
    seams = []
    for axis in (0, 1):
        dz = np.abs(np.diff(z, axis=axis))
        first = np.take(source, range(source.shape[axis] - 1), axis=axis)
        second = np.take(source, range(1, source.shape[axis]), axis=axis)
        change = (first != second) & np.isin(first, [1, 2, 4]) & np.isin(second, [1, 2, 4])
        seams.append(dz[change & np.isfinite(dz)])
    discontinuities = np.concatenate(seams)
    warnings = []
    if not manifest["source_acquisition_complete"]:
        warnings.append(f"{len(manifest['missing_files'])} required source files unavailable")
    if manifest["overlap"]["overlap_conflicts"]:
        warnings.append(
            "Measured land/NONNA overlap disagrees by > configured tolerance; inspect provenance and seams"
        )
    if discontinuities.size and discontinuities.max() > config["processing"]["overlap_warning_m"]:
        warnings.append(
            "Large elevation step at a measured-source boundary; inspect rejected joins"
        )
    if not intertidal_supported:
        warnings.append("Spanish Banks test has no measured tide-sensitive area")
    missing_destinations = [
        key for key in coastal_ids if locations[key]["worldPosition"][2] is None
    ]
    if missing_destinations:
        warnings.append("No elevation at destinations: " + ", ".join(missing_destinations))
    missing_labels, count = ndimage.label(~valid)
    report = {
        "structural_checks_pass": bool(structural),
        "numerical_acceptance_pass": bool(
            structural
            and manifest["source_acquisition_complete"]
            and intertidal_supported
            and not missing_destinations
            and any(item["shoreline_shift_m"] is not None for item in transects)
        ),
        "source_acquisition_complete": manifest["source_acquisition_complete"],
        "primary_source_preservation_pass": primary_preserved,
        "secondary_above_tide_range_pass": secondary_safe,
        "secondary_ground_nodes": int((source == 4).sum()),
        "orientation": orientation,
        "bathymetry_sign_check": sample,
        "inland_destinations_inside_aoi": {
            key: locations[key]["inside_aoi"]
            for key in config["validation"]["inland_destination_ids"]
        },
        "tile_errors": tile_errors,
        "z_range_m": [float(z[valid].min()), float(z[valid].max())] if valid.any() else None,
        "coverage_nodes": manifest["coverage_nodes"],
        "missing_components": int(count),
        "overlap": manifest["overlap"],
        "source_review": {
            "report": "source-review.json",
            "large_gap_count": source_review["large_gap_count"],
            "known_fraction_inside_aoi": source_review["known_fraction_inside_aoi"],
            "rejected_source_join_faces_active": source_review["rejected_source_join_faces_active"],
        },
        "largest_overlap_conflicts": conflict_samples,
        "source_boundary_max_step_m": float(discontinuities.max())
        if discontinuities.size
        else None,
        "spanish_banks": {
            "known_fraction": float(valid[region].mean()),
            "tidal_area_changes": intertidal_supported,
            "states": states,
            "northward_transects": transects,
        },
        "warnings": warnings,
        "source_caveats": "Known measurement gaps and source disagreements remain visible. Numerical acceptance is not survey or navigation certification.",
        "non_navigation": True,
    }
    write_json(world.processed / "validation.json", report)
    write_json(world.metadata / "latest-validation.json", report)
    manifest["status"] = (
        ("READY_WITH_SOURCE_WARNINGS" if warnings else "READY")
        if report["numerical_acceptance_pass"]
        else "INCOMPLETE_VALIDATION"
    )
    write_json(world.processed / "world.json", manifest)
    print(json.dumps(report, indent=2))
    return report
