import numpy as np
from rasterio.transform import from_origin

from gis.marine_affiliation import optical_cells, sea_polygons


def test_directed_shoreline_selects_water_right_and_preserves_island():
    # Northbound mainland coast: land west, sea east. CCW island has sea outside.
    mainland = [(2, -1), (2, 11)]
    island = [(6, 4), (8, 4), (8, 6), (6, 6), (6, 4)]
    polygons = sea_polygons([mainland, island], (0, 0, 10, 10))
    heights = np.full((10, 10), np.nan)
    heights[1, 4] = -10
    seeds = np.isfinite(heights)
    optical = optical_cells(heights, seeds, polygons, from_origin(0, 10, 1, 1))
    assert not optical[:, :2].any()
    assert optical[0, 4]
    assert not optical[4:6, 6:8].any()
    assert not optical[1, 4]  # Never replace measured bathymetry.


def test_unclosed_or_conflicting_coastline_fails_closed():
    bounds = (0, 0, 10, 10)
    assert sea_polygons([[(5, 3), (5, 7)]], bounds) == []
    assert sea_polygons([[(5, -1), (5, 11)], [(5, 11), (5, -1)]], bounds) == []


def test_affiliation_alone_does_not_create_unsurveyed_marine_basin():
    polygons = sea_polygons([[(2, -1), (2, 11)]], (0, 0, 10, 10))
    heights = np.full((10, 10), np.nan)
    assert not optical_cells(
        heights, np.zeros_like(heights, dtype=bool), polygons, from_origin(0, 10, 1, 1)
    ).any()


def test_known_dry_and_intertidal_cells_remain_untouched_even_inside_mapped_sea():
    polygons = sea_polygons([[(2, -1), (2, 11)]], (0, 0, 10, 10))
    heights = np.full((10, 10), np.nan)
    heights[3, 5:8] = [-10, -1, 10]
    original = heights.copy()
    optical = optical_cells(heights, heights == -10, polygons, from_origin(0, 10, 1, 1))
    assert not optical[3, 5:8].any()
    assert optical[2, 5:8].all()
    np.testing.assert_equal(heights, original)
