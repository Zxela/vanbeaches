"""Publish a portable runtime contract from the verified Blender export."""

import hashlib
import json
import shutil
import struct
import zlib
from pathlib import Path

import numpy as np
import rasterio


def depth_texture(source, output):
    """10m measured elevation atlas for water colour only; never shoreline geometry."""
    root = Path(__file__).resolve().parents[1]
    path = root / "data/processed" / source["configSha256"][:12] / "coast.tif"
    return elevation_texture(path, output, source["origin"], "depth")


def elevation_texture(path, output, origin, prefix, optical_only=None):
    with rasterio.open(path) as dataset:
        heights = dataset.read(1)
        bounds = dataset.bounds
    valid = np.isfinite(heights)
    encoded = (
        np.rint((np.nan_to_num(heights, nan=-512) + 512) * 100).clip(0, 65535).astype(np.uint16)
    )
    rgba = np.stack(
        (encoded >> 8, encoded & 255, np.zeros_like(encoded), valid * 255), axis=-1
    ).astype(np.uint8)
    if optical_only is not None:
        rgba[:, :, 2] = np.asarray(optical_only, dtype=np.uint8) * 255
    height, width = heights.shape

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
        )

    pixels = b"".join(b"\0" + row.tobytes() for row in rgba)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(pixels, 9))
        + chunk(b"IEND", b"")
    )
    name = f"{prefix}-{hashlib.sha256(png).hexdigest()[:12]}.png"
    (output / name).write_bytes(png)
    return {
        "assetUrl": name,
        "bounds": [
            bounds.left - origin[0],
            origin[1] - bounds.top,
            bounds.right - origin[0],
            origin[1] - bounds.bottom,
        ],
        "bytes": len(png),
        "sha256": hashlib.sha256(png).hexdigest(),
        "encoding": "RG uint16 centimetres above -512m; alpha coverage",
    }


def web(point):
    return [point[0], point[2], -point[1]]


def beach_view(source, beach, direction):
    """Find a measured dry-ground viewpoint near the canonical destination."""
    root = Path(__file__).resolve().parents[1]
    base = root / "data/processed" / source["configSha256"][:12]
    origin = source["origin"]
    x, y, _ = beach["worldPosition"]
    anchor = next(
        (
            a["local_ground_position"]
            for a in source["cameraAnchors"].values()
            if a.get("destination_id") == beach["id"]
        ),
        None,
    )
    if anchor is None:
        with (
            rasterio.open(base / "coast.tif") as ground,
            rasterio.open(base / "provenance.tif") as provenance,
        ):
            offsets = np.arange(-250, 251, 10)
            dx, dy = np.meshgrid(offsets, offsets)
            points = np.column_stack((x + origin[0] + dx.ravel(), y + origin[1] + dy.ravel()))
            heights = np.array([value[0] for value in ground.sample(points)])
            codes = np.array([value[0] for value in provenance.sample(points)])
            eligible = (
                np.isfinite(heights) & (heights > 3) & (heights < 10) & np.isin(codes, [1, 4])
            )
            if not eligible.any():
                return None
            distance = dx.ravel() ** 2 + dy.ravel() ** 2
            best = np.argmin(np.where(eligible, distance, np.inf))
            anchor = [
                points[best, 0] - origin[0],
                points[best, 1] - origin[1],
                float(heights[best]),
            ]
    position = web(anchor)
    position[1] += 5
    target = [position[0] + direction[0] * 400, position[1] - 3, position[2] + direction[2] * 400]
    return {"position": position, "target": target}


def generate(raw, output):
    source = json.loads((raw / "optimized.json").read_text(encoding="utf-8"))
    config = source["config"]
    origin = source["origin"]
    west, south, east, north = source["projectedBounds"]
    beaches = []
    for beach in source["beaches"]["beaches"]:
        if not beach["inside_aoi"] or beach["worldPosition"][2] is None:
            continue
        target = web(beach["worldPosition"])
        # Approach from open English Bay. All coordinates derive from existing records.
        direction = [-0.75, 0, -0.65] if target[0] > 1800 else [0.15, 0, -1]
        approach = [target[0] - direction[0] * 500, target[1] + 220, target[2] - direction[2] * 500]
        beaches.append(
            {
                "id": beach["id"],
                "slug": beach["slug"],
                "worldPosition": target,
                "cameraTarget": target,
                "cameraApproach": approach,
                "preferredAltitude": 220,
                "beachView": beach_view(source, beach, direction),
            }
        )
    tiles = []
    for tile in source["tiles"]:
        tile = dict(tile)
        tile["assetUrl"] = tile.pop("file")
        tiles.append(tile)
    manifest = {
        "version": 1,
        "units": "metres",
        "axes": "X east, Y up, Z south",
        "origin": {
            "latitude": config["horizontal"]["origin_lat"],
            "longitude": config["horizontal"]["origin_lon"],
            "utm": origin,
            "crs": config["horizontal"]["crs"],
        },
        "bounds": {
            "min": [west - origin[0], -200, origin[1] - north],
            "max": [east - origin[0], 300, origin[1] - south],
        },
        "verticalDatum": config["vertical"]["world_datum"],
        "chartDatumOffsetMetres": config["vertical"]["chart_datum_offset_m"],
        "datumRelationship": config["vertical"]["relationship"],
        "water": config["water"],
        "overview": {"position": [-1500, 11000, 6500], "target": [0, 0, -100]},
        "tiles": tiles,
        "beaches": beaches,
        "beachSourceSha256": source["beaches"]["source_sha256"],
        "configSha256": source["configSha256"],
        "sourceStatus": source["status"],
        "nonNavigation": True,
        "noticesUrl": "NOTICE.txt",
        "profile": {key: value for key, value in source["profile"].items() if key != "seconds"},
        "sources": source["sources"],
    }
    output.mkdir(parents=True, exist_ok=True)
    manifest["depthTexture"] = depth_texture(source, output)
    from export.camera_views import compose

    compose(manifest)
    encoded = json.dumps(manifest, separators=(",", ":"), allow_nan=False) + "\n"
    temporary = output / "manifest.json.tmp"
    temporary.write_text(encoded, encoding="utf-8")
    temporary.replace(output / "manifest.json")  # Manifest published last.
    root = Path(__file__).resolve().parents[1]
    shutil.copyfile(root / "NOTICE.md", output / "NOTICE.txt")
    report = {
        **source["profile"],
        "assets": len(tiles),
        "manifestBytes": len(encoded.encode()),
        "manifestSha256": hashlib.sha256(encoded.encode()).hexdigest(),
    }
    (root / "data/metadata/latest-web-export.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
