import numpy as np

from gis.marine import connection_levels


def test_inland_basin_floods_only_when_connected_over_sill():
    heights = np.array([[-5, 1, 1, 8], [-5, 1, -2, 8], [-5, 1, 1, 8]], dtype=float)
    seeds = heights == -5
    levels = connection_levels(heights, seeds)
    assert levels[1, 2] == 1
    assert not levels[1, 2] < 0.5
    assert levels[1, 2] < 1.5
    assert np.isinf(levels[:, 3]).all()


def test_unknown_barrier_and_diagonal_do_not_connect():
    heights = np.array([[-5, np.nan], [np.nan, -2]])
    levels = connection_levels(heights, heights == -5)
    assert np.isinf(levels[1, 1])


def test_all_canonical_tides_expand_without_flooding_high_land():
    heights = np.array([[-10, -2.6, -1.6, -0.1, 1.4, 1.9, 20]])
    levels = connection_levels(heights, heights == -10)
    counts = [(levels < tide - 3).sum() for tide in (0.5, 1.5, 3, 4.5, 5)]
    assert counts == [2, 3, 4, 5, 6]
