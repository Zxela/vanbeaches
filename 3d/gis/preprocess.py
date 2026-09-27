"""Stream classified LAS outside Blender; normalize numeric NONNA rasters."""

import json
import zipfile
import shutil
from concurrent.futures import ThreadPoolExecutor

import laspy
import numpy as np
import rasterio
from pyproj import CRS
from rasterio.warp import Resampling, reproject

from gis.acquire import manifest_for
from gis.common import ROOT, bathymetry_z, fingerprint, save_raster, sha256, write_json


def ground_cache_path(world, digest, spacing):
    # Water, materials, cameras and fusion policy must not invalidate expensive LAS reads.
    geometry = {
        "algorithm": "ground-nodal-v1",
        "sha256": digest,
        "spacing_m": spacing,
        "aoi": world.bounds_ll,
        "bounds": world.bounds,
        "crs": world.crs,
        "classes": world.config["sources"]["lidar"]["ground_classes"],
    }
    return world.cache / f"ground-{fingerprint(geometry)[:20]}.npz"


def coarsen_ground(z, count, row, col, ratio):
    """Count-weighted nodal pyramid; an odd integer ratio preserves bin boundaries."""
    if ratio < 1 or ratio % 2 != 1:
        raise ValueError("Ground pyramid requires an odd integer spacing ratio")
    rows = (np.arange(z.shape[0]) + row + ratio // 2) // ratio
    cols = (np.arange(z.shape[1]) + col + ratio // 2) // ratio
    shape = (rows[-1] - rows[0] + 1, cols[-1] - cols[0] + 1)
    bins = ((rows[:, None] - rows[0]) * shape[1] + cols[None, :] - cols[0]).ravel()
    counts = np.bincount(bins, weights=count.ravel(), minlength=int(np.prod(shape)))
    sums = np.bincount(
        bins, weights=(np.nan_to_num(z).astype(np.float64) * count).ravel(), minlength=counts.size
    )
    heights = np.full(counts.size, np.nan, dtype=np.float32)
    np.divide(sums, counts, out=heights, where=counts > 0)
    return (
        heights.reshape(shape),
        counts.reshape(shape).astype(np.uint32),
        int(rows[0]),
        int(cols[0]),
    )


def derive_overview(world, digest, spacing, cached):
    fine = world.config["processing"]["coastal_spacing_m"]
    if spacing <= fine or spacing % fine or int(spacing / fine) % 2 != 1:
        return False
    source = ground_cache_path(world, digest, fine)
    if not source.exists() or not source.with_suffix(".json").exists():
        return False
    with np.load(source) as data:
        z, count, row, col = coarsen_ground(
            data["z"], data["count"], int(data["row"]), int(data["col"]), int(spacing / fine)
        )
    metadata = json.loads(source.with_suffix(".json").read_text())
    metadata.update(
        grid_spacing_m=spacing,
        derived_from_grid_m=fine,
        aggregation="point-count-weighted nodal pyramid; same ground point populations, float32 means",
    )
    temporary = cached.with_suffix(".partial.npz")
    np.savez_compressed(temporary, z=z, count=count, row=row, col=col)
    temporary.replace(cached)
    write_json(cached.with_suffix(".json"), metadata)
    return True


def land_tile(world, archive_path, spacing, member=None, source_spec=None):
    """Ground-point mean at metre grid nodes; empty cells remain NaN."""
    receipt = archive_path.with_suffix(".zip.receipt.json")
    digest = json.loads(receipt.read_text())["sha256"] if receipt.exists() else sha256(archive_path)
    settings = source_spec or world.config["sources"]["lidar"]
    if member is not None or source_spec is not None:
        raw_settings = {
            key: settings[key] for key in ("dataset", "crs", "vertical_datum", "ground_classes")
        }
        digest = fingerprint([digest, member, raw_settings])
    cached = ground_cache_path(world, digest, spacing)
    legacy = world.cache / f"ground-{fingerprint([digest, world.key, spacing])[:20]}.npz"
    if not cached.exists() and legacy.exists() and legacy.with_suffix(".json").exists():
        shutil.copyfile(legacy, cached)
        shutil.copyfile(legacy.with_suffix(".json"), cached.with_suffix(".json"))
    if cached.exists() and cached.with_suffix(".json").exists():
        try:
            with zipfile.ZipFile(cached) as archive:
                if archive.testzip() is None:
                    return cached
        except (OSError, zipfile.BadZipFile):
            pass  # An interrupted cache write is regenerated from its source ZIP.
    if derive_overview(world, digest, spacing, cached):
        return cached
    full_shape, _ = world.grid(spacing)
    west, _, _, north = world.bounds
    with zipfile.ZipFile(archive_path) as archive:
        names = (
            [member]
            if member is not None
            else [n for n in archive.namelist() if n.lower().endswith((".las", ".laz"))]
        )
        if len(names) != 1:
            raise ValueError(f"Expected one point cloud in {archive_path}")
        # Zip stream avoids extracting multi-GB LAS alongside its ZIP.
        with archive.open(names[0]) as stream, laspy.open(stream) as cloud:
            header_crs = cloud.header.parse_crs()
            if header_crs is None or header_crs.to_epsg() not in (26910, 3157):
                raise ValueError(f"Unexpected LAS horizontal CRS in {archive_path}: {header_crs}")
            if CRS(settings["crs"]).to_epsg() != 3157:
                raise ValueError("City LiDAR coordinates must first be interpreted in EPSG:3157")
            # City LAS header says generic NAD83/26910. Published collection metadata
            # specifically identifies CSRS/GVRD. Preserve XY and record this override.
            x0 = max(0, int(np.floor((cloud.header.mins[0] - west) / spacing)))
            x1 = min(full_shape[1], int(np.ceil((cloud.header.maxs[0] - west) / spacing)) + 1)
            y0 = max(0, int(np.floor((north - cloud.header.maxs[1]) / spacing)))
            y1 = min(full_shape[0], int(np.ceil((north - cloud.header.mins[1]) / spacing)) + 1)
            if x1 <= x0 or y1 <= y0:
                raise ValueError(f"LAS coordinates do not intersect world: {archive_path}")
            shape = (y1 - y0, x1 - x0)
            sums = np.zeros(shape[0] * shape[1], dtype=np.float64)
            count = np.zeros(sums.size, dtype=np.uint32)
            classes = {}
            for points in cloud.chunk_iterator(world.config["processing"]["chunk_points"]):
                codes, counts = np.unique(points.classification, return_counts=True)
                for code, number in zip(codes, counts):
                    classes[str(code)] = classes.get(str(code), 0) + int(number)
                keep = np.isin(points.classification, settings["ground_classes"])
                keep &= ~np.asarray(points.withheld, dtype=bool)
                x, y, z = (
                    np.asarray(points.x)[keep],
                    np.asarray(points.y)[keep],
                    np.asarray(points.z)[keep],
                )
                col = np.floor((x - west) / spacing + 0.5).astype(int) - x0
                row = np.floor((north - y) / spacing + 0.5).astype(int) - y0
                valid = (
                    (col >= 0) & (col < shape[1]) & (row >= 0) & (row < shape[0]) & np.isfinite(z)
                )
                # Exclude the UTM rectangle outside the configured geographic AOI.
                lon, lat = world.unproject.transform(x, y)
                w, s, e, n = world.bounds_ll
                valid &= (lon >= w) & (lon <= e) & (lat >= s) & (lat <= n)
                index = row[valid] * shape[1] + col[valid]
                sums += np.bincount(index, weights=z[valid], minlength=sums.size)
                count += np.bincount(index, minlength=sums.size).astype(np.uint32)
            z = np.full(sums.size, np.nan, dtype=np.float32)
            np.divide(sums, count, out=z, where=count > 0)
            temporary = cached.with_suffix(".partial.npz")
            np.savez_compressed(
                temporary, z=z.reshape(shape), count=count.reshape(shape), row=y0, col=x0
            )
            temporary.replace(cached)
            write_json(
                cached.with_suffix(".json"),
                {
                    "archive": str(archive_path.relative_to(ROOT)),
                    "archive_member": names[0],
                    "sha256": digest,
                    "header_crs": header_crs.to_wkt(),
                    "interpreted_crs": settings["crs"],
                    "crs_override_reason": "City collection metadata specifies NAD83(CSRS) 4.0.0.BC.1.GVRD"
                    if header_crs.to_epsg() == 26910
                    else "LAS header agrees with published EPSG:3157",
                    "vertical_datum": settings["vertical_datum"],
                    "ground_classes": settings["ground_classes"],
                    "class_histogram": classes,
                    "grid_spacing_m": spacing,
                    "native_density_points_m2": settings.get("density_points_m2"),
                    "ground_points_used": int(count.sum()),
                },
            )
    return cached


def preprocess_lidar(world, manifest):
    products = {}
    missing = []
    for entry in manifest["lidar"]:
        if not (ROOT / entry["path"]).exists():
            missing.append(entry["id"])
    p = world.config["processing"]
    for spacing in sorted({p["overview_spacing_m"], p["coastal_spacing_m"]}):
        shape, _ = world.grid(spacing)
        dem = np.full(shape, np.nan, dtype=np.float32)
        weights = np.zeros(shape, dtype=np.uint32)
        evidence = []
        entries = [entry for entry in manifest["lidar"] if (ROOT / entry["path"]).exists()]

        def prepare(entry):
            print(f"Ground DEM {spacing}m: {entry['id']}", flush=True)
            return land_tile(world, ROOT / entry["path"], spacing)

        # zlib, NumPy and PROJ release the GIL; keep at most three LAS streams in memory.
        # map preserves input order, so weighted mosaics remain deterministic.
        with ThreadPoolExecutor(max_workers=3) as pool:
            for tile in pool.map(prepare, entries):
                evidence.append(json.loads(tile.with_suffix(".json").read_text()))
                with np.load(tile) as data:
                    row, col = int(data["row"]), int(data["col"])
                    z, count = data["z"], data["count"]
                    view = np.s_[row : row + z.shape[0], col : col + z.shape[1]]
                    old, old_count = dem[view], weights[view]
                    total = old_count.astype(np.float64) + count
                    combined = np.nan_to_num(old) * old_count + np.nan_to_num(z) * count
                    np.divide(combined, total, out=old, where=total > 0)
                    weights[view] += count
        target = world.processed / f"land-{spacing}m.tif"
        save_raster(
            world,
            target,
            dem,
            spacing,
            source="LIDAR",
            vertical_datum="CGVD28GVRD",
            grid_spacing_m=spacing,
            source_density_points_m2=world.config["sources"]["lidar"]["density_points_m2"],
        )
        products[str(spacing)] = {
            "path": target.name,
            "measured_nodes": int(np.isfinite(dem).sum()),
            "sources": evidence,
        }
    return {
        "products": products,
        "missing_tiles": missing,
        "ready_tiles": len(manifest["lidar"]) - len(missing),
    }


def preprocess_bathymetry(world, manifest):
    spacing = world.config["processing"]["overview_spacing_m"]
    shape, transform = world.grid(spacing)
    dem = np.full(shape, np.nan, dtype=np.float32)
    missing, evidence = [], []
    for entry in manifest["bathymetry"]:
        path = ROOT / entry["path"]
        if not path.exists():
            missing.append(entry["id"])
            continue
        sidecar = path.with_suffix(".source.json")
        if not sidecar.exists():
            raise ValueError(f"Missing verified source datum/sign metadata: {sidecar}")
        source = json.loads(sidecar.read_text())
        if source["dataset"] != world.config["sources"]["bathymetry"]["dataset"]:
            raise ValueError(f"Source is not the configured authoritative NONNA dataset: {sidecar}")
        if source["sha256"] != sha256(path):
            raise ValueError(f"Bathymetry checksum changed: {path}; rerun data explicitly")
        with rasterio.open(path) as dataset:
            if dataset.count != 1 or dataset.dtypes[0] not in ("float32", "float64"):
                raise ValueError(f"Not a numeric single-band bathymetry raster: {path}")
            raw = dataset.read(1, masked=True).filled(np.nan)
            normalized = bathymetry_z(raw, world.config["vertical"], source)
            target = np.full(shape, np.nan, dtype=np.float32)
            reproject(
                normalized,
                target,
                src_transform=dataset.transform,
                src_crs=dataset.crs,
                src_nodata=np.nan,
                dst_transform=transform,
                dst_crs=world.crs,
                dst_nodata=np.nan,
                resampling=Resampling.nearest,
            )
            valid = np.isfinite(target)
            dem[valid] = target[valid]
            evidence.append(
                {
                    **source,
                    "path": str(path.relative_to(ROOT)),
                    "source_crs": dataset.crs.to_string(),
                    "source_pixel_size": list(dataset.res),
                    "raw_range": [float(np.nanmin(raw)), float(np.nanmax(raw))],
                }
            )
    # All geometry is strictly clipped to the central geographic AOI.
    yy, xx = np.indices(shape)
    x, y = rasterio.transform.xy(transform, yy.ravel(), xx.ravel())
    lon, lat = world.unproject.transform(x, y)
    w, s, e, n = world.bounds_ll
    inside = ((lon >= w) & (lon <= e) & (lat >= s) & (lat <= n)).reshape(shape)
    dem[~inside] = np.nan
    # The WCS mosaic also includes terrestrial returns. They must not replace missing
    # bare-earth ground with tall non-bathymetric features. Retain every normalized
    # sample separately, but only elevations within the modeled tide range are seabed.
    maximum_cd = max(world.config["water"]["tide_test_states_cd_m"])
    maximum_world = maximum_cd + world.config["vertical"]["chart_datum_offset_m"]
    excluded = np.isfinite(dem) & (dem > maximum_world)
    save_raster(
        world,
        world.processed / "nonna-normalized.tif",
        dem,
        spacing,
        source="NONNA",
        vertical_datum="CGVD28GVRD",
        role="complete normalized source",
    )
    save_raster(
        world,
        world.processed / "nonna-above-tide-range.tif",
        np.where(excluded, dem, np.nan).astype(np.float32),
        spacing,
        source="NONNA",
        role="excluded from seabed, above modeled tide range",
    )
    dem[excluded] = np.nan
    target = world.processed / f"bathymetry-{spacing}m.tif"
    save_raster(
        world,
        target,
        dem,
        spacing,
        source="NONNA",
        vertical_datum="CGVD28GVRD",
        chart_datum_offset_m=world.config["vertical"]["chart_datum_offset_m"],
        nominal_source_resolution_m=world.config["sources"]["bathymetry"]["nominal_resolution_m"],
    )
    return {
        "path": target.name,
        "missing_chunks": missing,
        "sources": evidence,
        "measured_nodes": int(np.isfinite(dem).sum()),
        "excluded_above_tide_range_nodes": int(excluded.sum()),
        "maximum_seabed_height_cd_m": maximum_cd,
        "maximum_seabed_world_z_m": maximum_world,
        "complete_normalized_source": "nonna-normalized.tif",
        "excluded_source_raster": "nonna-above-tide-range.tif",
    }


def process(world, allow_partial=False):
    manifest = manifest_for(world)
    missing = [
        e["path"]
        for kind in ("lidar", "bathymetry")
        for e in manifest[kind]
        if not (ROOT / e["path"]).exists()
    ]
    if missing and not allow_partial:
        raise FileNotFoundError(
            f"{len(missing)} source files missing; see required-sources.json. "
            "--allow-partial creates an incomplete inspection product."
        )
    land = preprocess_lidar(world, manifest)
    bathy = preprocess_bathymetry(world, manifest)
    from gis.supplements import process_metro

    supplemental = process_metro(world)
    report = {
        "config_sha256": world.key,
        "land": land,
        "bathymetry": bathy,
        "supplemental_ground": supplemental,
        "source_acquisition_complete": not missing,
        "missing_files": missing,
    }
    write_json(world.processed / "processing.json", report)
    return report
