"""Official indexes and cached downloads. No credentials or web runtime needed."""

import concurrent.futures
import datetime
import json
import math
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import rasterio
from pyproj import Transformer
from shapely.geometry import box, shape

from gis.common import ROOT, fingerprint, sha256, write_json

USER_AGENT = "VanBeaches-offline-coast/0.1"


def download(url, path, refresh=False):
    """Cache completed downloads; partial responses never become source files."""
    path = Path(path)
    receipt = path.with_suffix(path.suffix + ".receipt.json")
    if path.exists() and not refresh:
        if receipt.exists():
            info = json.loads(receipt.read_text())
            if info["url"] != url or path.stat().st_size != info["bytes"]:
                raise ValueError(f"Cache mismatch: {path}; remove or refresh explicitly")
            return info
        # A file placed by the developer is adopted and fingerprinted once.
        info = {
            "url": url,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "acquisition": "local_manual",
        }
        write_json(receipt, info)
        return info
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_suffix(path.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response, part.open("wb") as stream:
        for chunk in iter(lambda: response.read(1024 * 1024), b""):
            stream.write(chunk)
        stream.flush()
        expected = response.headers.get("Content-Length")
        if expected and part.stat().st_size != int(expected):
            raise IOError(f"Truncated download: {url}")
        info = {
            "url": url,
            "bytes": part.stat().st_size,
            "sha256": sha256(part),
            "etag": response.headers.get("ETag"),
            "last_modified": response.headers.get("Last-Modified"),
            "retrieved_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
    part.replace(path)
    write_json(receipt, info)
    return info


def cached_json(world, url, refresh=False):
    path = world.cache / (fingerprint(url)[:20] + ".json")
    download(url, path, refresh)
    return json.loads(path.read_text(encoding="utf-8"))


def discover(world, refresh=False):
    source = world.config["sources"]["lidar"]
    metadata = cached_json(world, source["api"], refresh)
    description = metadata["metas"]["default"]["description"]
    for expected in ("CGVD28GVRD", "CSRS", "UTM Zone 10"):
        if expected not in description:
            raise ValueError(f"City source metadata changed: missing {expected}")
    aoi = box(*world.bounds_ll)
    records = []
    offset = 0
    while True:
        page = cached_json(world, f"{source['api']}/records?limit=100&offset={offset}", refresh)
        for record in page["results"]:
            geom = record["geom"]
            geom = geom.get("geometry", geom)
            if shape(geom).intersects(aoi):
                records.append(
                    {
                        "id": record["name"],
                        "url": record["lidar_url"],
                        "geometry": geom,
                        "path": f"data/raw/lidar/{record['name']}.zip",
                    }
                )
        offset += len(page["results"])
        if offset >= page["total_count"]:
            break
        if not page["results"]:
            raise ValueError("Incomplete City index pagination")
    bathy = world.config["sources"]["bathymetry"]
    capabilities = world.cache / "nonna-wcs-capabilities.xml"
    describe = world.cache / "nonna-wcs-describe.xml"
    download(
        bathy["wcs"] + "?service=WCS&version=1.0.0&request=GetCapabilities", capabilities, refresh
    )
    query = urllib.parse.urlencode(
        {
            "service": "WCS",
            "version": "1.0.0",
            "request": "DescribeCoverage",
            "coverage": bathy["coverage"],
        }
    )
    download(bathy["wcs"] + "?" + query, describe, refresh)
    xml = ET.parse(describe)
    if bathy["coverage"] not in describe.read_text() or not xml.findall(".//{*}offsetVector"):
        raise ValueError("NONNA coverage metadata is unavailable or changed")
    # Use WCS 1.0 XY order in its explicitly advertised response CRS.
    to_mercator = Transformer.from_crs(4326, 3857, always_xy=True)
    w, s, e, n = world.bounds_ll
    step = bathy["request_chunk_degrees"]
    requests = []
    for iy in range(math.ceil((n - s) / step)):
        for ix in range(math.ceil((e - w) / step)):
            bounds = [
                w + ix * step,
                s + iy * step,
                min(e, w + (ix + 1) * step),
                min(n, s + (iy + 1) * step),
            ]
            pad = bathy["request_overlap_degrees"]
            request_bounds = [bounds[0] - pad, bounds[1] - pad, bounds[2] + pad, bounds[3] + pad]
            projected = to_mercator.transform_bounds(*request_bounds)
            # ~10m on the ground; WCS native grid can be coarser, retained in metadata.
            scale = math.cos(math.radians((bounds[1] + bounds[3]) / 2))
            resolution = bathy["nominal_resolution_m"] / scale
            query = dict(
                service="WCS",
                version="1.0.0",
                request="GetCoverage",
                coverage=bathy["coverage"],
                crs="EPSG:3857",
                response_crs="EPSG:3857",
                bbox=",".join(map(str, projected)),
                width=math.ceil((projected[2] - projected[0]) / resolution),
                height=math.ceil((projected[3] - projected[1]) / resolution),
                format="GeoTIFF",
                interpolation="nearest neighbor",
            )
            url = bathy["wcs"] + "?" + urllib.parse.urlencode(query)
            cell = f"nonna10_{fingerprint(url)[:16]}"
            requests.append(
                {
                    "id": cell,
                    "bounds_wgs84": bounds,
                    "url": url,
                    "path": f"data/raw/bathymetry/{cell}.tif",
                }
            )
    manifest = {
        "config_sha256": world.key,
        "aoi": world.config["aoi"],
        "lidar": sorted(records, key=lambda r: r["id"]),
        "bathymetry": requests,
        "city_metadata": metadata["metas"]["default"],
        "wcs_native_grid": [el.text for el in xml.findall(".//{*}offsetVector")],
        "wcs_native_crs": "EPSG:3857",
        "non_navigation": True,
    }
    write_json(world.metadata / "required-sources.json", manifest)
    print(f"AOI: {len(records)} City LAS ZIPs; {len(requests)} NONNA-10 WCS chunks", flush=True)
    return manifest


def manifest_for(world):
    path = world.metadata / "required-sources.json"
    if not path.exists():
        raise FileNotFoundError("Run python 3d/pipeline.py discover first")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest["config_sha256"] != world.key:
        raise ValueError("Configuration changed; rerun discover")
    return manifest


def fetch(world, kind="all", refresh=False):
    manifest = manifest_for(world)
    entries = [
        (k, entry) for k in ("lidar", "bathymetry") if kind in ("all", k) for entry in manifest[k]
    ]

    def one(pair):
        source_kind, entry = pair
        path = ROOT / entry["path"]
        try:
            info = download(entry["url"], path, refresh)
            if source_kind == "lidar":
                with zipfile.ZipFile(path) as archive:
                    if not any(n.lower().endswith((".las", ".laz")) for n in archive.namelist()):
                        raise ValueError("Archive contains no LAS/LAZ")
            else:
                with rasterio.open(path) as dataset:
                    if dataset.count != 1 or dataset.dtypes[0] not in ("float32", "float64"):
                        raise ValueError("Expected numeric elevation GeoTIFF, not a rendered map")
                    if not dataset.crs or dataset.nodata is None:
                        raise ValueError("Source CRS and nodata must be explicit")
                source = world.config["sources"]["bathymetry"]
                sidecar = path.with_suffix(".source.json")
                if sidecar.exists() and not refresh:
                    previous = json.loads(sidecar.read_text())
                    if previous["sha256"] != info["sha256"]:
                        raise ValueError(f"Source metadata checksum mismatch: {sidecar}")
                    return {"id": entry["id"], "kind": source_kind, "status": "ready", **info}
                write_json(
                    sidecar,
                    {
                        **info,
                        "dataset": source["dataset"],
                        "vertical_datum": source["vertical_datum"],
                        "value_convention": source["value_convention"],
                        "nominal_resolution_m": source["nominal_resolution_m"],
                        "native_wcs_grid": manifest["wcs_native_grid"],
                        "datum_evidence": "CHS NONNA catalogue / 2024 FAQ: Chart Datum",
                        "sign_evidence": "WCS checked at English Bay: negative underwater; positive drying heights",
                        "datum_limitation": "Catalogue-level CD; WCS does not expose per-survey datum metadata",
                        "non_navigation": True,
                    },
                )
            result = {"id": entry["id"], "kind": source_kind, "status": "ready", **info}
        except (OSError, ValueError, zipfile.BadZipFile, rasterio.errors.RasterioError) as error:
            result = {
                "id": entry["id"],
                "kind": source_kind,
                "status": "blocked",
                "url": entry["url"],
                "path": entry["path"],
                "error": str(error),
            }
        print(f"{result['status']}: {source_kind}/{entry['id']}", flush=True)
        return result

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(one, entries))
    write_json(world.metadata / f"acquisition-{kind}.json", results)
    return all(result["status"] == "ready" for result in results)
