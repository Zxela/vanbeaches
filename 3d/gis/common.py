"""Configuration, coordinate transforms, grids and provenance utilities."""

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio
import yaml
from pyproj import Transformer
from rasterio.transform import from_origin

ROOT = Path(__file__).resolve().parents[1]


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class World:
    def __init__(self, path=None):
        self.path = Path(path or ROOT / "config/world.yaml").resolve()
        self.config = yaml.safe_load(self.path.read_text(encoding="utf-8"))
        self.key = fingerprint(self.config)
        self.crs = self.config["horizontal"]["crs"]
        if self.crs != "EPSG:3157":
            raise ValueError("The City LAS adapter currently requires world CRS EPSG:3157")
        self.project = Transformer.from_crs("EPSG:4326", self.crs, always_xy=True)
        self.unproject = Transformer.from_crs(self.crs, "EPSG:4326", always_xy=True)
        h = self.config["horizontal"]
        self.origin = self.project.transform(h["origin_lon"], h["origin_lat"])
        a = self.config["aoi"]
        self.bounds_ll = (a["west"], a["south"], a["east"], a["north"])
        if not (a["west"] < a["east"] and a["south"] < a["north"]):
            raise ValueError("Invalid AOI")
        bounds = self.project.transform_bounds(*self.bounds_ll, densify_pts=21)
        size = self.config["processing"]["tile_size_m"]
        self.bounds = tuple(
            (math.floor(v / size) if i < 2 else math.ceil(v / size)) * size
            for i, v in enumerate(bounds)
        )
        p = self.config["processing"]
        for spacing in (p["overview_spacing_m"], p["coastal_spacing_m"]):
            if size % spacing or (size / spacing + 1) ** 2 > p["max_vertices_per_tile"]:
                raise ValueError("Spacing must divide tile size and respect vertex budget")
        self.raw = ROOT / "data/raw"
        self.cache = ROOT / "data/cache"
        self.processed = ROOT / "data/processed" / self.key[:12]
        self.metadata = ROOT / "data/metadata"
        for folder in (self.raw, self.cache, self.processed, self.metadata, ROOT / "output"):
            folder.mkdir(parents=True, exist_ok=True)

    def local(self, lon, lat, z=0):
        x, y = self.project.transform(lon, lat)
        return [x - self.origin[0], y - self.origin[1], z]

    def geographic(self, x, y):
        return self.unproject.transform(x + self.origin[0], y + self.origin[1])

    def grid(self, spacing):
        # Pixel centres are the mesh nodes. Same anchored nodes at every resolution.
        west, south, east, north = self.bounds
        shape = (round((north - south) / spacing) + 1, round((east - west) / spacing) + 1)
        return shape, from_origin(west - spacing / 2, north + spacing / 2, spacing, spacing)

    def inside(self, lon, lat):
        w, s, e, n = self.bounds_ll
        return w <= lon <= e and s <= lat <= n


def save_raster(world, path, array, spacing, **tags):
    _, transform = world.grid(spacing)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=array.shape[1],
        height=array.shape[0],
        count=1,
        dtype=array.dtype,
        crs=world.crs,
        transform=transform,
        nodata=np.nan if array.dtype.kind == "f" else 0,
        compress="deflate",
        tiled=True,
    ) as dataset:
        dataset.write(array, 1)
        dataset.update_tags(config_sha256=world.key, **tags)


def bathymetry_z(values, vertical, source):
    if source["vertical_datum"] != "Chart Datum":
        raise ValueError("Unsupported bathymetry datum; provide an explicit verified transform")
    convention = source["value_convention"]
    if convention == "depth_positive_down":
        values = -values
    elif convention != "elevation_positive_up":
        raise ValueError("Unknown bathymetry sign convention")
    return values + vertical["chart_datum_offset_m"]
