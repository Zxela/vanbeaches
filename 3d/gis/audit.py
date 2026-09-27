"""Map unresolved coverage and quantify source disagreement without changing heights."""

import json

import numpy as np
from rasterio.features import shapes
from scipy import ndimage
from shapely.geometry import box, mapping, shape
from shapely.ops import transform as transform_geometry

from gis.common import write_json


def gap_inventory(z, nonna, inside, transform, spacing, minimum_area):
    """Only missing nodes inside the AOI count; extent padding is not missing survey."""
    labels, _ = ndimage.label(inside & ~np.isfinite(z))
    counts = np.bincount(labels.ravel())
    retained = counts * spacing**2 >= minimum_area
    retained[0] = False
    features = []
    boundary = ndimage.binary_dilation(~inside)
    for polygon, value in shapes(
        labels.astype(np.int32), mask=retained[labels], transform=transform
    ):
        label = int(value)
        mask = labels == label
        raw_available = int((mask & np.isfinite(nonna)).sum())
        features.append(
            {
                "type": "Feature",
                "geometry": polygon,
                "properties": {
                    "id": f"gap_{label:05}",
                    "area_m2": int(counts[label] * spacing**2),
                    "nodes": int(counts[label]),
                    "nonna_nodata_nodes": int(counts[label]) - raw_available,
                    "nonna_excluded_above_tide_nodes": raw_available,
                    "cause": "missing_elevation_sources"
                    if raw_available == 0
                    else "mixed_missing_and_excluded_nonna"
                    if raw_available < counts[label]
                    else "nonna_above_tide_range_without_ground",
                    "touches_aoi_boundary": bool((mask & boundary).any()),
                },
            }
        )
    features.sort(
        key=lambda feature: (-feature["properties"]["area_m2"], feature["properties"]["id"])
    )
    return features, int((labels > 0).sum())


def review(world, manifest, z, land, bathy, nonna, transform):
    spacing = world.config["processing"]["overview_spacing_m"]
    yy, xx = np.indices(z.shape)
    x = transform.c + (xx + 0.5) * spacing
    y = transform.f - (yy + 0.5) * spacing
    lon, lat = world.unproject.transform(x, y)
    west, south, east, north = world.bounds_ll
    inside = (lon >= west) & (lon <= east) & (lat >= south) & (lat <= north)
    settings = world.config["validation"]
    features, missing = gap_inventory(
        z, nonna, inside, transform, spacing, settings["gap_report_min_area_m2"]
    )
    sources = json.loads((world.metadata / "required-sources.json").read_text())
    destinations = [beach for beach in manifest["beaches"]["beaches"] if beach["inside_aoi"]]
    for feature in features:
        polygon = shape(feature["geometry"])
        properties = feature["properties"]
        properties["projected_bounds"] = list(polygon.bounds)
        properties["projected_crs"] = world.crs
        properties["grid_spacing_m"] = spacing
        properties["action"] = (
            "Additional authoritative measurements required; not automatically filled"
        )
        geographic = transform_geometry(world.unproject.transform, polygon)
        feature["geometry"] = mapping(geographic)
        properties["geographic_bounds"] = list(geographic.bounds)
        properties["lidar_files"] = [
            entry["path"]
            for entry in sources["lidar"]
            if shape(entry["geometry"]).intersects(geographic)
        ]
        properties["nonna_files"] = [
            entry["path"]
            for entry in sources["bathymetry"]
            if box(*entry["bounds_wgs84"]).intersects(geographic)
        ]
        supplemental = manifest["source_processing_metadata"].get("supplemental_ground", {})
        properties["metro_members"] = [
            entry["member"]
            for entry in supplemental.get("members", [])
            if box(*entry["bounds"]).intersects(polygon)
        ]
        point = polygon.representative_point()
        beach = min(
            destinations,
            key=lambda b: (b["worldPosition"][0] + world.origin[0] - point.x) ** 2
            + (b["worldPosition"][1] + world.origin[1] - point.y) ** 2,
        )
        properties["nearest_existing_destination"] = beach["id"]
    geojson = {"type": "FeatureCollection", "features": features}
    write_json(world.processed / "coverage-gaps.geojson", geojson)
    both = np.isfinite(land) & np.isfinite(bathy)
    differences = land - bathy
    regions = []
    radius = settings["overlap_review_radius_m"]
    for beach in destinations:
        bx, by = world.project.transform(beach["longitude"], beach["latitude"])
        region = (x - bx) ** 2 + (y - by) ** 2 <= radius**2
        samples = differences[region & both]
        regions.append(
            {
                "destination_id": beach["id"],
                "radius_m": radius,
                "overlap_nodes": int(samples.size),
                "median_lidar_minus_nonna_m": float(np.median(samples)) if samples.size else None,
                "absolute_difference_p95_m": float(np.percentile(np.abs(samples), 95))
                if samples.size
                else None,
                "absolute_difference_max_m": float(np.max(np.abs(samples)))
                if samples.size
                else None,
                "known_fraction_inside_aoi": float(np.isfinite(z[region & inside]).mean()),
            }
        )
    report = {
        "config_sha256": world.key,
        "grid_spacing_m": spacing,
        "aoi_nodes": int(inside.sum()),
        "missing_inside_aoi_nodes": missing,
        "known_fraction_inside_aoi": float(np.isfinite(z[inside]).mean()),
        "large_gap_minimum_area_m2": settings["gap_report_min_area_m2"],
        "large_gap_count": len(features),
        "large_gaps": [feature["properties"] for feature in features],
        "destination_overlap_reviews": regions,
        "rejected_source_join_faces_active": sum(
            tile["rejected_source_join_faces"] for tile in manifest["tiles"] if tile["active"]
        ),
        "policy": "No datum adjustment inferred from disagreements. Missing geometry stays missing; steep mixed-source connectors are excluded and retained as debug wireframes.",
        "supplemental_ground_accepted": manifest["source_processing_metadata"]
        .get("supplemental_ground", {})
        .get("accepted", False),
        "gap_geometry": "coverage-gaps.geojson",
        "source_gap_reference": "https://open.canada.ca/data/en/dataset/d3881c4c-650d-4070-bf9b-1e00aabf0a1d",
    }
    write_json(world.processed / "source-review.json", report)
    write_json(world.metadata / "latest-source-review.json", report)
    return report
