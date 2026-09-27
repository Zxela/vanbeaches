"""Algorithm fixtures only; production terrain is always acquired NRCan elevation."""

import json
import struct
from types import SimpleNamespace

import numpy as np

from export.export_regional import glb, shore_skirts
from gis.analyze_horizons import TerrainSampler, analyze, curvature_drop, sample
from gis.preprocess_regional_dem import adaptive_mesh, rasterize_mesh


def test_curvature_and_nearer_ridge_occlusion():
    assert abs(curvature_drop(90000, 6371008.8) - 635.699) < 0.01
    z = np.zeros((101, 101), np.float32)
    z[70, :] = 100  # 300m north of the observer
    z[30, :] = 150  # 700m north: taller, but hidden behind the nearer ridge
    world = SimpleNamespace(origin=(0, 0))
    config = {
        "earth_radius_m": 6371008.8,
        "curvature": True,
        "ray_step_m": 10,
        "survey_radius_m": 1000,
        "azimuth_step_degrees": 90,
        "tile_size_m": 100,
    }
    manifest = {
        "beaches": [
            {"id": "fixture", "beachView": {"position": [500, 5, 0], "target": [500, 5, -400]}}
        ]
    }
    grid = {"height": z, "spacing": 10, "bounds": [0, 0, 1000, 1000]}
    report, selected, locks = analyze(world, config, manifest, [grid], select=True)
    north = report["beaches"][0]["profile"][0]
    assert north["distance"] == 300
    assert north["elevation"] == 100
    assert north["occludedSamples"] > 0
    assert (500, 300) in selected
    assert (500, 300) in locks


def test_indexed_sampling_preserves_tile_edges_and_coast_priority():
    grids = [
        {"bounds": [0, 0, 200, 200], "spacing": 10, "height": np.ones((21, 21), np.float32)},
        {"bounds": [0, 0, 100, 100], "spacing": 10, "height": np.full((11, 11), 2, np.float32)},
        {"bounds": [100, 0, 200, 100], "spacing": 10, "height": np.full((11, 11), 3, np.float32)},
        {"bounds": [20, 20, 60, 60], "spacing": 10, "height": np.full((5, 5), 4, np.float32)},
    ]
    x = np.array([0, 25, 100, 200, 120, 105, 10, 300.0])
    y = np.array([0, 25, 30, 100, 120, 55, 100, 300.0])
    np.testing.assert_allclose(
        TerrainSampler(grids, 100)(x, y), sample(grids, x, y), equal_nan=True
    )


def test_adaptive_mesh_preserves_peak_and_observer_angular_error():
    yy, xx = np.mgrid[:65, :65]
    height = 25 + 120 * np.exp(-((xx - 27) ** 2 + (yy - 31) ** 2) / 24)
    grid = {"height": height.astype(np.float32), "spacing": 25, "bounds": [0, 0, 1600, 1600]}
    v, f, error = adaptive_mesh(grid, 8, [(675, 825)], observers=[(400, 0)])
    assert len(f) < 64 * 64 * 2
    assert error <= 8
    assert np.any(np.all(np.isclose(v, [675, 825, 145]), axis=1))
    normals = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    assert np.all(normals[:, 2] > 0)
    surface = rasterize_mesh(v, f, grid)["height"]
    distance = np.hypot(xx * 25 - 400, 1600 - yy * 25)
    angular = np.degrees(np.arctan2(abs(surface - height), np.maximum(150, distance)))
    assert angular.max() < 0.021


def test_glb_axis_winding_and_underwater_closure():
    v = np.array([[0, 0, 1], [100, 0, 2], [0, 100, 3]], np.float32)
    f = np.array([[0, 1, 2]], np.int32)
    v, f = shore_skirts(v, f)
    assert v[:, 2].min() == -20
    encoded = glb(v, f)
    magic, version, size = struct.unpack_from("<III", encoded)
    assert magic == 0x46546C67 and version == 2 and size == len(encoded)
    length = struct.unpack_from("<I", encoded, 12)[0]
    doc = json.loads(encoded[20 : 20 + length])
    binary = encoded[28 + length :]
    view = doc["bufferViews"][0]
    positions = np.frombuffer(binary[: view["byteLength"]], dtype="<f4").reshape(-1, 3)
    np.testing.assert_allclose(positions[:3], [[0, 1, 0], [100, 2, 0], [0, 3, -100]])
    assert np.cross(positions[1] - positions[0], positions[2] - positions[0])[1] > 0


def test_real_regional_acceptance_when_available():
    from gis.common import World
    import pytest

    world = World()
    path = world.processed / "regional/regional.json"
    if not path.exists():
        pytest.skip("Run regional pipeline for real data acceptance")
    report = json.loads(path.read_text())
    assert report["horizonPass"]
    assert len(report["lodValidation"][0]["beaches"]) >= 9
    assert any(b["id"] == "wreck-beach" for b in report["lodValidation"][0]["beaches"])
    assert sum(t["sourcePixels"]["HRDEM"] for t in report["coverage"]) > 0
    assert sum(t["sourcePixels"]["MRDEM"] for t in report["coverage"]) > 0
    assert sum(t["sourcePixels"]["unknown"] for t in report["coverage"]) == 0
