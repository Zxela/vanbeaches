"""Discover official DTM COGs; read bounded overviews, never whole national files."""

import json
import math
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import numpy as np
import rasterio
from affine import Affine
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject
from rasterio.windows import Window, from_bounds

from .common import ROOT, fingerprint, sha256, write_json


def settings():
    return json.loads((ROOT / "config/regional.json").read_text())


def discover(world, config, refresh=False):
    radius = config["survey_radius_m"]
    bounds = [
        world.origin[0] - radius,
        world.origin[1] - radius,
        world.origin[0] + radius,
        world.origin[1] + radius,
    ]
    bbox = world.unproject.transform_bounds(*bounds, densify_pts=21)
    path = world.metadata / "regional-sources.json"
    query = {
        "collections": ",".join(config["collections"]),
        "bbox": ",".join(map(str, bbox)),
        "limit": 100,
    }
    url = config["stac"] + "/search?" + urllib.parse.urlencode(query)
    if path.exists() and not refresh:
        saved = json.loads(path.read_text())
        if saved["query"] == url:
            return saved
    items = []
    next_url = url
    while next_url:
        with urllib.request.urlopen(next_url, timeout=60) as response:
            page = json.load(response)
        items.extend(f for f in page["features"] if "dtm" in f["assets"])
        next_url = next((a["href"] for a in page.get("links", []) if a["rel"] == "next"), None)
    if not any(f["collection"] == "mrdem-30" for f in items):
        raise ValueError("Authoritative MRDEM fallback not discovered")
    result = {
        "query": url,
        "accessedAt": datetime.now(timezone.utc).isoformat(),
        "bbox": bbox,
        "items": items,
        "verticalDatum": "CGVD2013",
        "licence": "https://open.canada.ca/en/open-government-licence-canada",
        "coveragePolicy": "STAC bounds are discovery only. Valid DTM pixels establish coverage.",
    }
    write_json(path, result)
    return result


class RegionalSource:
    def __init__(self, world, config, discovery):
        self.world, self.config, self.discovery = world, config, discovery
        self.cache = world.raw / "regional"
        self.cache.mkdir(exist_ok=True)

    def grid(self, bounds, spacing):
        """Node-centred EPSG:3157 grids, MRDEM fills only missing HRDEM pixels."""
        key = fingerprint(
            {
                "bounds": bounds,
                "spacing": spacing,
                "items": self.discovery,
                "offset": self.config["cgvd2013_to_world_m"],
                "algorithm": 1,
            }
        )[:20]
        path = self.cache / f"{key}.npz"
        if path.exists():
            with np.load(path) as data:
                return data["height"], data["source"]
        w, s, e, n = bounds
        shape = (round((n - s) / spacing) + 1, round((e - w) / spacing) + 1)
        dst_transform = from_origin(w - spacing / 2, n + spacing / 2, spacing, spacing)
        heights = np.full(shape, np.nan, np.float32)
        codes = np.zeros(shape, np.uint8)
        receipts = []
        # HRDEM first. Each COG is read at an appropriate overview using byte ranges.
        features = sorted(self.discovery["items"], key=lambda f: f["collection"] == "mrdem-30")
        with rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            GDAL_HTTP_TIMEOUT="60",
            GDAL_HTTP_MAX_RETRY="3",
            CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
        ):
            for feature in features:
                href = feature["assets"]["dtm"]["href"]
                with rasterio.open(href) as ds:
                    transform = Transformer.from_crs(self.world.crs, ds.crs, always_xy=True)
                    src_bounds = transform.transform_bounds(
                        w - spacing, s - spacing, e + spacing, n + spacing, densify_pts=21
                    )
                    window = from_bounds(*src_bounds, ds.transform)
                    try:
                        window = window.intersection(Window(0, 0, ds.width, ds.height))
                    except rasterio.errors.WindowError:
                        continue
                    width = max(2, math.ceil(window.width * ds.res[0] / spacing))
                    height = max(2, math.ceil(window.height * ds.res[1] / spacing))
                    values = ds.read(
                        1,
                        window=window,
                        out_shape=(height, width),
                        masked=True,
                        resampling=Resampling.bilinear,
                    ).filled(np.nan)
                    source_transform = ds.window_transform(window) * Affine.scale(
                        window.width / width, window.height / height
                    )
                    projected = np.full(shape, np.nan, np.float32)
                    reproject(
                        values,
                        projected,
                        src_transform=source_transform,
                        src_crs=ds.crs,
                        dst_transform=dst_transform,
                        dst_crs=self.world.crs,
                        src_nodata=np.nan,
                        dst_nodata=np.nan,
                        resampling=Resampling.bilinear,
                    )
                    use = np.isfinite(projected) & ~np.isfinite(heights)
                    heights[use] = projected[use] + self.config["cgvd2013_to_world_m"]
                    code = 2 if feature["collection"] == "mrdem-30" else 1
                    codes[use] = code
                    receipts.append(
                        {
                            "id": feature["id"],
                            "url": href,
                            "nativeSpacing": ds.res,
                            "usedPixels": int(use.sum()),
                            "sourceCode": code,
                        }
                    )
        np.savez_compressed(path, height=heights, source=codes)
        write_json(
            path.with_suffix(".source.json"),
            {
                "bounds": bounds,
                "spacing": spacing,
                "crs": self.world.crs,
                "sha256": sha256(path),
                "sources": receipts,
                "verticalOffsetMetres": self.config["cgvd2013_to_world_m"],
            },
        )
        return heights, codes
