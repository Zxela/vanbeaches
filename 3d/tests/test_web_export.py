"""Numerical and format invariants; fixtures are never deployed as geography."""

import json
import struct
import zlib

import numpy as np
import rasterio
from rasterio.transform import from_origin

from export import generate_manifest


def test_axis_conversion_is_right_handed():
    east = np.array(generate_manifest.web([1, 0, 0]))
    north = np.array(generate_manifest.web([0, 1, 0]))
    up = np.array(generate_manifest.web([0, 0, 1]))
    np.testing.assert_array_equal(np.cross(east, north), up)


def test_height_atlas_preserves_signed_depth_and_unknown_coverage(tmp_path, monkeypatch):
    # Isolate the export's configured source root, including a nodata hole.
    script = tmp_path / "export/generate_manifest.py"
    script.parent.mkdir()
    monkeypatch.setattr(generate_manifest, "__file__", str(script))
    base = tmp_path / "data/processed/abcdefabcdef"
    base.mkdir(parents=True)
    heights = np.array([[-12.25, -2.5], [2.0, np.nan]], dtype=np.float32)
    with rasterio.open(
        base / "coast.tif",
        "w",
        driver="GTiff",
        width=2,
        height=2,
        count=1,
        dtype="float32",
        transform=from_origin(100, 200, 10, 10),
    ) as dataset:
        dataset.write(heights, 1)
    result = generate_manifest.depth_texture(
        {"configSha256": "abcdefabcdef0", "origin": [100, 200, 0]}, tmp_path
    )
    png = (tmp_path / result["assetUrl"]).read_bytes()
    cursor, compressed = 8, b""
    while cursor < len(png):
        length = struct.unpack(">I", png[cursor : cursor + 4])[0]
        if png[cursor + 4 : cursor + 8] == b"IDAT":
            compressed += png[cursor + 8 : cursor + 8 + length]
        cursor += length + 12
    rows = (
        np.frombuffer(zlib.decompress(compressed), dtype=np.uint8)
        .reshape(2, 9)[:, 1:]
        .reshape(2, 2, 4)
    )
    decoded = (rows[:, :, 0].astype(float) * 256 + rows[:, :, 1]) / 100 - 512
    np.testing.assert_allclose(decoded[np.isfinite(heights)], heights[np.isfinite(heights)])
    assert rows[1, 1, 3] == 0
    assert rows[0, 0, 3] == 255
    assert result["bounds"] == [0, 0, 20, 20]


def test_real_export_budget_when_available():
    from pathlib import Path
    import pytest

    path = Path(__file__).resolve().parents[2] / "client/public/coast-assets/manifest.json"
    if not path.exists():
        pytest.skip("Run 3d-export for real-data integration checks")
    manifest = json.loads(path.read_text())
    base = [
        tile for tile in manifest["tiles"] if tile["lod"] == 0 and tile.get("layer") != "regional"
    ]
    assert sum(tile["bytes"] for tile in base) < 5_000_000
    assert sum(tile["triangles"] for tile in base) < 300_000
    assert max(tile["bytes"] for tile in manifest["tiles"]) < 25 * 1024 * 1024
    assert all(beach["id"] != "trout-lake" for beach in manifest["beaches"])
    assert manifest["chartDatumOffsetMetres"] == -3
