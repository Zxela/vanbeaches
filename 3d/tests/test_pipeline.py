"""Small synthetic numeric fixtures test algorithms; never exported as Vancouver geometry."""

import json
import io
import zipfile

import laspy
import numpy as np
import pytest

from gis.beaches import destinations
from gis.build_coast import fill_small_gaps, fuse, mesh_arrays, stitch_edges
from gis.build_coast import mesh_product
from gis.audit import gap_inventory
from gis.common import World, bathymetry_z
from gis.preprocess import land_tile
from gis.preprocess import coarsen_ground
from gis.preprocess import ground_cache_path


def test_ground_cache_survives_water_changes_but_not_classification_changes(world):
    before = ground_cache_path(world, "source-hash", 2)
    world.config["water"]["initial_tide_cd_m"] = 4.5
    world.key = "new-whole-world-config-hash"
    assert ground_cache_path(world, "source-hash", 2) == before
    world.config["sources"]["lidar"]["ground_classes"] = [1, 2]
    assert ground_cache_path(world, "source-hash", 2) != before


def test_ground_pyramid_preserves_population_and_global_alignment():
    z = np.array([[2, 4, 8, 10, 12, 20]], dtype=np.float32)
    counts = np.array([[2, 1, 3, 0, 1, 4]], dtype=np.uint32)
    heights, population, row, col = coarsen_ground(z, counts, 5, 0, 5)
    # Global fine nodes 0..2 belong to overview node 0; 3..5 to node 1.
    assert (row, col) == (1, 0)
    assert population.tolist() == [[6, 5]]
    assert heights[0] == pytest.approx([32 / 6, 92 / 5])
    assert population.sum() == counts.sum()


def test_download_cache_and_checksum(tmp_path, monkeypatch):
    from gis.acquire import download
    import urllib.request

    class Response(io.BytesIO):
        headers = {"Content-Length": "5"}

    monkeypatch.setattr(urllib.request, "urlopen", lambda *a, **k: Response(b"hello"))
    path = tmp_path / "source.bin"
    result = download("https://example.test/source", path)
    assert result["bytes"] == 5 and len(result["sha256"]) == 64
    monkeypatch.setattr(
        urllib.request, "urlopen", lambda *a, **k: pytest.fail("Cache redownloaded")
    )
    assert download("https://example.test/source", path) == result


def test_truncated_download_never_becomes_source(tmp_path, monkeypatch):
    from gis.acquire import download
    import urllib.request

    class Response(io.BytesIO):
        headers = {"Content-Length": "50"}

    monkeypatch.setattr(urllib.request, "urlopen", lambda *a, **k: Response(b"hello"))
    path = tmp_path / "source.bin"
    with pytest.raises(IOError, match="Truncated"):
        download("https://example.test/source", path)
    assert not path.exists()


@pytest.fixture
def world(tmp_path):
    result = World()
    result.cache = tmp_path / "cache"
    result.cache.mkdir()
    return result


def test_coordinate_roundtrip_and_axes(world):
    origin = world.config["horizontal"]
    lon, lat = origin["origin_lon"], origin["origin_lat"]
    assert world.local(lon, lat) == pytest.approx([0, 0, 0])
    east = world.local(lon + 0.01, lat)
    north = world.local(lon, lat + 0.01)
    assert east[0] > 700 and abs(east[1]) < 10
    assert north[1] > 1100 and abs(north[0]) < 10
    assert world.geographic(*east[:2]) == pytest.approx([lon + 0.01, lat], abs=1e-8)


@pytest.mark.parametrize(
    "convention,values",
    [
        ("depth_positive_down", [0, 10, -1]),
        ("elevation_positive_up", [0, -10, 1]),
    ],
)
def test_datum_and_sign(convention, values):
    source = {"vertical_datum": "Chart Datum", "value_convention": convention}
    assert bathymetry_z(np.array(values), {"chart_datum_offset_m": -3}, source) == pytest.approx(
        [-3, -13, -2]
    )


def test_reject_unknown_datum():
    with pytest.raises(ValueError, match="datum"):
        bathymetry_z(np.zeros(1), {}, {"vertical_datum": "unknown"})


def test_bathymetry_preserves_but_excludes_above_tide_returns(world, tmp_path, monkeypatch):
    import rasterio
    import gis.preprocess as preprocess
    from gis.common import sha256, write_json
    from rasterio.windows import Window, transform as window_transform

    monkeypatch.setattr(preprocess, "ROOT", tmp_path)
    world.processed = tmp_path / "processed"
    world.processed.mkdir()
    _, transform = world.grid(10)
    col = round((world.origin[0] - world.bounds[0]) / 10)
    row = round((world.bounds[3] - world.origin[1]) / 10)
    path = tmp_path / "source.tif"
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=3,
        height=1,
        count=1,
        dtype="float32",
        crs=world.crs,
        nodata=-9999,
        transform=window_transform(Window(col, row, 3, 1), transform),
    ) as dataset:
        dataset.write(np.array([[-10, 1, 20]], dtype=np.float32), 1)
    write_json(
        path.with_suffix(".source.json"),
        {
            "dataset": world.config["sources"]["bathymetry"]["dataset"],
            "sha256": sha256(path),
            "vertical_datum": "Chart Datum",
            "value_convention": "elevation_positive_up",
        },
    )
    report = preprocess.preprocess_bathymetry(
        world, {"bathymetry": [{"id": "fixture", "path": "source.tif"}]}
    )
    assert report["excluded_above_tide_range_nodes"] == 1
    with rasterio.open(world.processed / "bathymetry-10m.tif") as dataset:
        values = dataset.read(1)[row, col : col + 3]
        assert values[:2] == pytest.approx([-13, -2])
        assert np.isnan(values[2])
    with rasterio.open(world.processed / "nonna-normalized.tif") as dataset:
        assert dataset.read(1)[row, col + 2] == 17


def test_existing_beaches_are_derived(world):
    records = {b["id"]: b for b in destinations(world)["beaches"]}
    assert len(records) == 9
    assert not records["trout-lake"]["inside_aoi"]
    assert (
        records["kitsilano-beach"]["worldPosition"][0]
        > records["jericho-beach"]["worldPosition"][0]
    )
    assert records["spanish-banks"]["slug"] == "spanish-banks"


def test_conservative_gap_fill(world):
    z = np.zeros((9, 9), dtype=np.float32)
    z[4, 4] = np.nan
    z[0:3, 0:3] = np.nan
    mask = np.where(np.isfinite(z), 2, 0).astype(np.uint8)
    fill_small_gaps(z, mask, 10, world.config["processing"])
    assert z[4, 4] == 0 and mask[4, 4] == 3
    assert np.isnan(z[0:3, 0:3]).all()  # Boundary-connected coverage never invented.


def test_large_holes_and_cliffs_are_not_filled(world):
    z = np.zeros((20, 20), dtype=np.float32)
    z[3:15, 3:15] = np.nan
    source = np.where(np.isfinite(z), 1, 0).astype(np.uint8)
    fill_small_gaps(z, source, 10, world.config["processing"])
    assert np.isnan(z[3:15, 3:15]).all()
    z = np.zeros((5, 5), dtype=np.float32)
    z[2, 2] = np.nan
    z[1, 2] = 100
    source = np.where(np.isfinite(z), 1, 0).astype(np.uint8)
    fill_small_gaps(z, source, 10, world.config["processing"])
    assert np.isnan(z[2, 2])


def test_land_priority_and_overlap_diagnostics(world):
    land = np.array([[1, np.nan], [2, np.nan]], dtype=np.float32)
    bathy = np.array([[-4, -10], [2, np.nan]], dtype=np.float32)
    z, source, report = fuse(land, bathy, 10, world.config["processing"])
    assert z[0, 0] == 1 and z[0, 1] == -10
    assert source.tolist() == [[1, 2], [1, 0]]
    assert report["overlap_conflicts"] == 1


def test_mesh_winding_and_missing_cells():
    z = np.zeros((3, 3), dtype=np.float32)
    z[1, 1] = np.nan
    vertices, faces, sources = mesh_arrays(z, np.ones_like(z, dtype=np.uint8), 10)
    normals = np.cross(
        vertices[faces[:, 1]] - vertices[faces[:, 0]], vertices[faces[:, 2]] - vertices[faces[:, 0]]
    )
    assert (normals[:, 2] > 0).all()
    assert len(faces) == 2  # Triangles incident on missing centre were removed.
    assert (sources == 1).all()


def test_conflicting_sources_do_not_create_artificial_walls(world):
    z = np.array([[4, -20], [4, -20]], dtype=np.float32)
    source = np.array([[1, 2], [1, 2]], dtype=np.uint8)
    vertices, faces, codes, rejected = mesh_product(z, source, 10, world.config["processing"])
    assert len(faces) == 0 and len(codes) == 0 and len(rejected) == 2
    assert set(vertices[:, 2]) == {-20, 4}  # No survey heights modified.
    _, faces, _, rejected = mesh_product(z, np.ones_like(source), 10, world.config["processing"])
    assert len(faces) == 2 and len(rejected) == 0  # A measured cliff is not suppressed.
    z[:, 1] = 3
    _, faces, _, rejected = mesh_product(z, source, 10, world.config["processing"])
    assert len(faces) == 2 and len(rejected) == 0  # Gentle measured transitions survive.


def test_gap_inventory_distinguishes_nodata_exclusions_and_extent_padding():
    from rasterio.transform import from_origin

    z = np.zeros((7, 7), dtype=np.float32)
    inside = np.ones_like(z, dtype=bool)
    inside[0] = False
    z[0] = np.nan
    z[2, 2] = z[4, 4] = np.nan
    nonna = np.full_like(z, np.nan)
    nonna[4, 4] = 50  # Preserved source, excluded from seabed because above tide range.
    features, missing = gap_inventory(z, nonna, inside, from_origin(0, 70, 10, 10), 10, 100)
    assert missing == 2 and len(features) == 2
    assert {f["properties"]["cause"] for f in features} == {
        "missing_elevation_sources",
        "nonna_above_tide_range_without_ground",
    }


def test_imagery_tile_window_respects_axes_and_exact_boundaries():
    from gis.imagery import tile_window

    # Cache rows increase south; columns increase east. No extra tile on exact edges.
    assert tile_window((100, 100, 200, 200), (0, 300), 100) == (1, 1, 1, 1)
    assert tile_window((99, 99, 201, 201), (0, 300), 100) == (0, 0, 2, 2)


def test_secondary_ground_never_replaces_primary_sources(world):
    land = np.array([[2, np.nan, np.nan]], dtype=np.float32)
    bathy = np.array([[np.nan, -10, np.nan]], dtype=np.float32)
    secondary = np.array([[20, 30, 1]], dtype=np.float32)
    z, codes, _ = fuse(land, bathy, 10, world.config["processing"], secondary)
    assert z.tolist() == [[2, -10, 1]]
    assert codes.tolist() == [[1, 2, 4]]
    _, _, codes = mesh_arrays(np.ones((2, 2)), np.full((2, 2), 4, dtype=np.uint8), 10)
    assert codes.tolist() == [4, 4]


def test_secondary_ground_rejects_incompatible_datum(world):
    from gis.supplements import overlap_check

    primary = np.zeros((11, 11), dtype=np.float32)
    settings = world.config["sources"]["supplemental_ground"]
    assert overlap_check(primary, primary + 0.1, settings)["accepted"]
    assert not overlap_check(primary, primary + 3, settings)["accepted"]
    sparse = np.full_like(primary, np.nan)
    sparse[0, 0] = 0
    assert not overlap_check(primary, sparse, settings)["accepted"]


def test_secondary_water_returns_are_never_used_as_seabed():
    from gis.supplements import dry_ground_candidates

    source = np.array([[-1, 0.3, 2.5, 3, 30]], dtype=np.float32)
    result = dry_ground_candidates(source, 2.5)
    assert np.isnan(result[0, :3]).all()
    assert result[0, 3:].tolist() == [3, 30]
    assert source[0, 1] == pytest.approx(0.3)  # Full diagnostic source is unchanged.


def test_imagery_preserves_transparent_coverage(tmp_path):
    import rasterio
    from gis.imagery import rgba
    from rasterio.transform import from_origin

    values = np.array([[[200, 40]], [[100, 50]], [[20, 60]], [[0, 255]]], dtype=np.uint8)
    path = tmp_path / "imagery.png"
    with rasterio.open(
        path,
        "w",
        driver="PNG",
        width=2,
        height=1,
        count=4,
        dtype="uint8",
        transform=from_origin(0, 1, 1, 1),
    ) as dataset:
        dataset.write(values)
    assert np.array_equal(rgba(path), values)


def test_adjacent_tiles_share_elevations():
    yy, xx = np.indices((6, 11))
    z = (xx + 2 * yy).astype(np.float32)
    left, _, _ = mesh_arrays(z[:, :6], np.ones((6, 6), dtype=np.uint8), 10)
    right, _, _ = mesh_arrays(z[:, 5:], np.ones((6, 6), dtype=np.uint8), 10)
    assert left[left[:, 0] == 50, 1:] == pytest.approx(right[right[:, 0] == 0, 1:])


def test_lod_edges_follow_coarse_polylines():
    low = np.array([[0, 10, 20], [20, 30, 40], [40, 50, 60]], dtype=np.float32)
    high = np.zeros((11, 11), dtype=np.float32)
    source = np.ones_like(high, dtype=np.uint8)
    stitch_edges(high, source, low, np.ones_like(low, dtype=np.uint8), 5)
    assert high[0] == pytest.approx(np.linspace(0, 20, 11))
    assert high[:, -1] == pytest.approx(np.linspace(20, 60, 11))
    assert source[0, 1] == 3 and source[0, 0] == 1


def test_real_las_reader_filters_classes_and_withheld(world, tmp_path):
    from pyproj import CRS

    x, y = world.project.transform(-123.2, 49.28)
    header = laspy.LasHeader(point_format=6, version="1.4")
    header.add_crs(CRS.from_epsg(26910))
    header.offsets = [x, y, 0]
    cloud = laspy.LasData(header)
    cloud.x = np.full(4, x)
    cloud.y = np.full(4, y)
    cloud.z = np.array([2, 4, 200, 300])
    cloud.classification = [2, 2, 6, 2]
    cloud.withheld = [0, 0, 0, 1]
    las = tmp_path / "fixture.las"
    cloud.write(las)
    archive = tmp_path / "fixture.zip"
    with zipfile.ZipFile(archive, "w") as stream:
        stream.write(las, "fixture.las")
    # Evidence path should work for external manual input too.
    import gis.preprocess as preprocess

    original_root = preprocess.ROOT
    preprocess.ROOT = tmp_path
    try:
        cached = land_tile(world, archive, 2)
        # A cancelled run may leave a corrupt cache; it must recover from the real LAS.
        cached.write_bytes(b"interrupted cache write")
        cached = land_tile(world, archive, 2)
    finally:
        preprocess.ROOT = original_root
    with np.load(cached) as result:
        assert result["count"].sum() == 2
        assert np.nanmax(result["z"]) == 3
    info = json.loads(cached.with_suffix(".json").read_text())
    assert info["ground_points_used"] == 2
    assert info["interpreted_crs"] == "EPSG:3157"
