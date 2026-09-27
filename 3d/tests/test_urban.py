import json
import math

import pytest
from shapely.geometry import Point, Polygon

from gis.common import ROOT, World
from gis.urban import bridge_name, landcover_mesh, local_geometry


class SlopedGround:
    def sample(self, x, y, fallback=0):
        return x * 0.05 + y * 0.02


def test_landcover_drapes_measured_terrain_with_bounded_triangles_and_holes():
    polygon = Polygon(
        [(0, 0), (300, 0), (300, 300), (0, 300)],
        holes=[[(100, 100), (200, 100), (200, 200), (100, 200)]],
    )
    vertices, faces = landcover_mesh(polygon, SlopedGround())
    assert faces
    for x, y, z in vertices:
        assert math.isclose(z, round(x * 0.05 + y * 0.02 + 0.6, 2), abs_tol=0.02)
    for face in faces:
        corners = [vertices[index][:2] for index in face]
        assert max(math.dist(a, b) for a in corners for b in corners) <= 100.02
        assert polygon.covers(Polygon(corners))


def test_landcover_does_not_invent_missing_ground():
    class MissingGround:
        def sample(self, x, y, fallback=0):
            return fallback

    vertices, faces = landcover_mesh(
        Polygon([(0, 0), (100, 0), (100, 100), (0, 100)]), MissingGround()
    )
    assert not vertices and not faces


def test_local_coordinates_and_named_bridge_alignment():
    world = World()
    point = local_geometry(world, Point(-123.19, 49.28))
    assert abs(point.x) < 0.001 and abs(point.y) < 0.001
    assert bridge_name({"name": "Burrard Street Bridge"}) == "Burrard Bridge"
    assert bridge_name({"name": "Unknown Street"}) is None


def test_published_city_source_and_skyline_heights_match():
    output = ROOT.parent / "client/public/coast-assets"
    descriptor_path = World().metadata / "latest-urban-export.json"
    if not descriptor_path.exists():
        pytest.skip("Optional production GIS audit: run pipeline.py urban first")
    descriptor = json.loads(descriptor_path.read_text())
    full_path, coarse_path = output / descriptor["assetUrl"], output / descriptor["coarseAssetUrl"]
    if not full_path.exists() or not coarse_path.exists():
        pytest.skip("Optional production GIS audit: restore the matching exported urban assets")
    full = json.loads(full_path.read_text(encoding="utf-8"))
    coarse = json.loads(coarse_path.read_text(encoding="utf-8"))
    buildings = {item["id"]: item for item in full["buildings"]}
    assert len(buildings) > 1000
    assert {item["name"] for item in full["bridges"]} == {
        "Lions Gate Bridge",
        "Burrard Bridge",
        "Granville Bridge",
        "Cambie Bridge",
    }
    for building in coarse["buildings"]:
        assert building == buildings[building["id"]]
        assert building["heightSource"] == "city-lidar-2009"
    lions = next(item for item in full["bridges"] if item["name"] == "Lions Gate Bridge")
    assert len(lions["towers"]) == 2
    assert 400 < math.dist(lions["towers"][0]["position"], lions["towers"][1]["position"]) < 500
    assert any("Pacific Spirit" in item["name"] and item["faces"] for item in full["landcover"])
