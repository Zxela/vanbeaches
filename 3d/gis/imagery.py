"""Official City orthophotos as bounded terrain textures; never a source of geometry."""

import json
import math
import warnings
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.errors import NotGeoreferencedWarning
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import Resampling, reproject

from gis.acquire import cached_json, download
from gis.common import ROOT, write_json


def tile_window(bounds, origin, span):
    west, south, east, north = bounds
    return (
        math.floor((west - origin[0]) / span),
        math.floor((origin[1] - north) / span),
        math.ceil((east - origin[0]) / span) - 1,
        math.ceil((origin[1] - south) / span) - 1,
    )


def rgba(path):
    # XYZ cache images are intentionally ungeoreferenced; service tileInfo supplies placement.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", NotGeoreferencedWarning)
        with rasterio.open(path) as dataset:
            values = dataset.read()
            if dataset.count == 1:
                palette = dataset.colormap(1)
                lookup = np.zeros((256, 4), dtype=np.uint8)
                for key, color in palette.items():
                    lookup[key] = color
                return lookup[values[0]].transpose(2, 0, 1)
            if dataset.count == 4:
                return values
            if dataset.count != 3:
                raise ValueError(f"Unexpected orthophoto bands: {path}")
            return np.concatenate((values, dataset.dataset_mask()[None]), axis=0)


def prepare(world, refresh=False):
    config = world.config["imagery"]
    if not config["enabled"]:
        return
    path = world.processed / "world.json"
    manifest = json.loads(path.read_text())
    metadata = cached_json(world, config["api"], refresh)["metas"]["default"]
    if metadata["license"] != "Open Government Licence - Vancouver":
        raise ValueError("City imagery licence metadata changed; review before acquisition")
    service = cached_json(world, config["service"] + "?f=pjson", refresh)
    if (
        not service.get("exportTilesAllowed")
        or service["documentInfo"]["author"] != "City_of_Vancouver"
    ):
        raise ValueError("Expected official, export-enabled City imagery service")
    info = service["tileInfo"]
    size = info["cols"]
    if (
        size != info["rows"]
        or info["spatialReference"].get("latestWkid", info["spatialReference"]["wkid"]) != 3857
    ):
        raise ValueError("Unexpected imagery tile scheme")
    resolution = next(lod["resolution"] for lod in info["lods"] if lod["level"] == config["zoom"])
    span = resolution * size
    origin = (info["origin"]["x"], info["origin"]["y"])
    mercator = Transformer.from_crs(world.crs, "EPSG:3857", always_xy=True)
    land_tiles = {
        tuple(t["projected_bounds"])
        for t in manifest["tiles"]
        if t["source_counts"]["1"] or t["source_counts"].get("4", 0)
    }
    needed = set()
    for bounds in land_tiles:
        left, top, right, bottom = tile_window(mercator.transform_bounds(*bounds), origin, span)
        needed.update(
            (row, col) for row in range(top, bottom + 1) for col in range(left, right + 1)
        )
    raw = world.raw / "imagery" / config["dataset"] / str(config["zoom"])
    entries = [
        {
            "row": row,
            "col": col,
            "url": f"{config['service']}/tile/{config['zoom']}/{row}/{col}",
            "path": str((raw / f"{row}_{col}.tile").relative_to(ROOT)),
        }
        for row, col in sorted(needed)
    ]
    write_json(
        world.metadata / "required-imagery.json",
        {
            "config_sha256": world.key,
            "dataset": config["dataset"],
            "city_metadata": metadata,
            "tile_info": info,
            "tiles": entries,
        },
    )
    print(f"Imagery: {len(entries)} official cached tiles at level {config['zoom']}", flush=True)

    def fetch(entry):
        try:
            receipt = download(entry["url"], ROOT / entry["path"], refresh)
            pixels = rgba(ROOT / entry["path"])
            if pixels.shape != (4, size, size):
                raise ValueError("Unexpected imagery tile dimensions")
            return {**entry, "sha256": receipt["sha256"], "status": "ready"}, pixels
        except (OSError, ValueError) as error:
            return {**entry, "status": "missing", "error": str(error)}, None

    left, right = min(e["col"] for e in entries), max(e["col"] for e in entries)
    top, bottom = min(e["row"] for e in entries), max(e["row"] for e in entries)
    mosaic = np.zeros((4, (bottom - top + 1) * size, (right - left + 1) * size), dtype=np.uint8)
    evidence = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for index, (entry, pixels) in enumerate(pool.map(fetch, entries), 1):
            evidence.append(entry)
            if pixels is not None:
                row, col = (entry["row"] - top) * size, (entry["col"] - left) * size
                mosaic[:, row : row + size, col : col + size] = pixels
            if index % 100 == 0:
                print(f"Imagery: {index}/{len(entries)} tiles checked", flush=True)
    pixels = config["tile_pixels"]
    tile_size = world.config["processing"]["tile_size_m"]
    west, south, east, north = world.bounds
    width, height = (
        round((east - west) / tile_size * pixels),
        round((north - south) / tile_size * pixels),
    )
    projected = np.zeros((4, height, width), dtype=np.uint8)
    reproject(
        mosaic,
        projected,
        src_transform=from_origin(
            origin[0] + left * span, origin[1] - top * span, resolution, resolution
        ),
        src_crs="EPSG:3857",
        dst_transform=from_bounds(*world.bounds, width, height),
        dst_crs=world.crs,
        src_alpha=4,
        dst_alpha=4,
        resampling=Resampling.bilinear,
    )
    textures = world.processed / "textures"
    textures.mkdir(exist_ok=True)
    products = {}
    for bounds in sorted(land_tiles):
        w, s, e, n = bounds
        row, col = round((north - n) / tile_size * pixels), round((w - west) / tile_size * pixels)
        values = projected[:, row : row + pixels, col : col + pixels]
        if not values[3].any():
            continue
        target = textures / f"ortho_{int(w)}_{int(s)}.png"
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", NotGeoreferencedWarning)
            with rasterio.open(
                target, "w", driver="PNG", width=pixels, height=pixels, count=4, dtype="uint8"
            ) as dataset:
                dataset.write(values)
        products[bounds] = {
            "file": str(target.relative_to(world.processed)),
            "projected_bounds": list(bounds),
            "pixels": pixels,
            "pixel_spacing_m": tile_size / pixels,
            "covered_fraction": float((values[3] > 0).mean()),
        }
    for tile in manifest["tiles"]:
        tile["imagery"] = products.get(tuple(tile["projected_bounds"]))
    report = {
        "dataset": config["dataset"],
        "service": config["service"],
        "attribution": "City of Vancouver",
        "licence": metadata["license"],
        "licence_url": metadata["license_url"],
        "capture_dates": "2022-06-06 to 2022-07-01",
        "native_orthophoto_resolution_m": 0.075,
        "service_resolution_mercator_m": resolution,
        "zoom": config["zoom"],
        "texture_spacing_m": tile_size / pixels,
        "texture_count": len(products),
        "ready_source_tiles": sum(e["status"] == "ready" for e in evidence),
        "missing_source_tiles": [e for e in evidence if e["status"] != "ready"],
        "source_tiles": evidence,
        "role": "Appearance only above modeled intertidal zone; no elevation or bathymetry inferred from imagery",
    }
    manifest["imagery"] = {k: v for k, v in report.items() if k != "source_tiles"}
    write_json(world.processed / "imagery.json", report)
    write_json(world.metadata / "latest-imagery.json", report)
    write_json(path, manifest)
    print(f"Prepared {len(products)} georeferenced terrain textures", flush=True)
    return report
