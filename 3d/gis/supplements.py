"""Independent Metro 2022 ground measurements, accepted only after an overlap check."""

import json
import zipfile
from concurrent.futures import ThreadPoolExecutor

import laspy
import numpy as np
import rasterio

from gis.acquire import cached_json, download
from gis.common import ROOT, save_raster, write_json


def acquire(world, refresh=False):
    settings = world.config["sources"]["supplemental_ground"]
    if not settings["enabled"]:
        return None
    metadata = cached_json(world, settings["metadata_url"], refresh)
    if metadata["owner"] != "mvagoladmin" or "CGVD28GVRD2018" not in metadata["description"]:
        raise ValueError("Metro source metadata changed; review datum and publisher")
    if "Open Government Licence" not in metadata["licenseInfo"]:
        raise ValueError("Metro source licence changed")
    print("Checking Metro Vancouver 2022 bare-earth archive (4.67GB cached download)", flush=True)
    receipt = download(settings["url"], ROOT / settings["path"], refresh)
    write_json(
        world.metadata / "metro-2022-source.json",
        {"metadata": metadata, "receipt": receipt, "settings": settings},
    )
    return metadata


def overlap_check(primary, secondary, settings):
    both = np.isfinite(primary) & np.isfinite(secondary)
    differences = (secondary - primary)[both]
    median = float(np.median(differences)) if differences.size else None
    p95 = float(np.percentile(np.abs(differences), 95)) if differences.size else None
    accepted = bool(
        differences.size >= 100
        and abs(median) <= settings["max_median_difference_m"]
        and p95 <= settings["max_p95_difference_m"]
    )
    return {
        "overlap_nodes": int(differences.size),
        "median_secondary_minus_city_m": median,
        "absolute_difference_p95_m": p95,
        "accepted": accepted,
        "policy": "Fill only nodes missing BOTH City LiDAR and NONNA, above the highest test tide plus margin; never replace primary measurements. No fitted datum correction.",
    }


def dry_ground_candidates(dem, minimum_height):
    """Secondary aerial returns over water cannot be interpreted as the seafloor."""
    result = dem.copy()
    result[result <= minimum_height] = np.nan
    return result


def process_metro(world):
    from gis.preprocess import land_tile

    settings = world.config["sources"]["supplemental_ground"]
    if not settings["enabled"]:
        return {"enabled": False, "accepted": False}
    archive_path = ROOT / settings["path"]
    if not archive_path.exists():
        raise FileNotFoundError("Run pipeline.py data --source supplemental before processing")
    metadata_path = world.metadata / "metro-2022-source.json"
    if not metadata_path.exists() or json.loads(metadata_path.read_text())["settings"] != settings:
        acquire(world)
    # A hashed index avoids repeatedly opening all compressed LAS headers.
    receipt = json.loads(archive_path.with_suffix(".zip.receipt.json").read_text())
    index_path = world.cache / f"metro-index-{receipt['sha256'][:16]}.json"
    if index_path.exists():
        entries = json.loads(index_path.read_text())
    else:
        entries = []
        with zipfile.ZipFile(archive_path) as archive:
            for name in archive.namelist():
                if not name.lower().endswith((".las", ".laz")):
                    continue
                with archive.open(name) as stream, laspy.open(stream) as cloud:
                    header = cloud.header
                    crs = header.parse_crs()
                    if crs is None or crs.to_epsg() != 3157:
                        raise ValueError(f"Unexpected Metro LAS CRS: {name}")
                    entries.append(
                        {
                            "member": name,
                            "bounds": [*header.mins[:2], *header.maxs[:2]],
                            "points": int(header.point_count),
                        }
                    )
        write_json(index_path, entries)
    west, south, east, north = world.bounds
    entries = [
        e
        for e in entries
        if e["bounds"][0] < east
        and e["bounds"][2] > west
        and e["bounds"][1] < north
        and e["bounds"][3] > south
    ]
    grids = {}
    products = {}
    for spacing in sorted(
        {
            world.config["processing"]["coastal_spacing_m"],
            world.config["processing"]["overview_spacing_m"],
        }
    ):
        shape, _ = world.grid(spacing)
        sums = np.zeros(shape, dtype=np.float64)
        counts = np.zeros(shape, dtype=np.uint32)

        def prepare(entry):
            return land_tile(
                world, archive_path, spacing, member=entry["member"], source_spec=settings
            )

        with ThreadPoolExecutor(max_workers=3) as pool:
            for index, cached in enumerate(pool.map(prepare, entries), 1):
                with np.load(cached) as data:
                    z, count = data["z"], data["count"]
                    row, col = int(data["row"]), int(data["col"])
                    view = np.s_[row : row + z.shape[0], col : col + z.shape[1]]
                    sums[view] += np.nan_to_num(z).astype(np.float64) * count
                    counts[view] += count
                if index % 10 == 0:
                    print(f"Metro ground {spacing}m: {index}/{len(entries)} members", flush=True)
        dem = np.full(shape, np.nan, dtype=np.float32)
        np.divide(sums, counts, out=dem, where=counts > 0)
        dem += settings["world_offset_m"]
        cutoff = (
            max(world.config["water"]["tide_test_states_cd_m"])
            + world.config["vertical"]["chart_datum_offset_m"]
            + settings["minimum_height_above_high_tide_m"]
        )
        save_raster(
            world,
            world.processed / f"metro-ground-full-{spacing}m.tif",
            dem,
            spacing,
            source="METRO_LIDAR_2022",
            role="all classified source returns, including near-level water returns",
        )
        eligible = dry_ground_candidates(dem, cutoff)
        name = f"metro-ground-{spacing}m.tif"
        save_raster(
            world,
            world.processed / name,
            eligible,
            spacing,
            source="METRO_LIDAR_2022",
            vertical_datum=settings["vertical_datum"],
            world_offset_m=settings["world_offset_m"],
        )
        products[str(spacing)] = {
            "path": name,
            "eligible_nodes": int(np.isfinite(eligible).sum()),
            "raw_measured_nodes": int(np.isfinite(dem).sum()),
            "minimum_world_z_m": cutoff,
        }
        grids[spacing] = dem
    coarse = world.config["processing"]["overview_spacing_m"]
    with rasterio.open(world.processed / f"land-{coarse}m.tif") as dataset:
        primary = dataset.read(1)
        check = overlap_check(primary, grids[coarse], settings)
    with rasterio.open(world.processed / f"bathymetry-{coarse}m.tif") as dataset:
        deep = dataset.read(1) < -10
    check["secondary_returns_over_deep_nonna_nodes"] = int(
        (deep & np.isfinite(grids[coarse]) & ~np.isfinite(primary)).sum()
    )
    check["marine_caveat"] = (
        "Source contains near-level classified returns over water. Only dry-ground candidates above the tide range may supplement geometry; full rasters remain available for inspection."
    )
    report = {
        **check,
        "enabled": True,
        "source": json.loads(metadata_path.read_text()),
        "members": entries,
        "products": products,
    }
    write_json(world.processed / "supplemental-ground.json", report)
    write_json(world.metadata / "latest-supplemental-ground.json", report)
    print(f"Metro overlap acceptance: {check}", flush=True)
    return report
