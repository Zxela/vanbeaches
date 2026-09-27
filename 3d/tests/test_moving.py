"""Pure native animation checks; no Blender process required."""

import importlib.util
import math
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location(
    "moving", Path(__file__).resolve().parents[1] / "blender/moving.py"
)
moving = importlib.util.module_from_spec(spec)
spec.loader.exec_module(moving)


class MovingTests(unittest.TestCase):
    def setUp(self):
        self.route = dict(
            id="test",
            type="ferry",
            subtype="local-ferry",
            points=[[0, 0, 0], [100, 0, 0], [100, 0, 100]],
            speed=2,
            phase=0,
            draft=1,
            beam=4,
            dwell=10,
        )

    def test_browser_position_parity_and_native_axes(self):
        self.assertEqual(moving.sample_route(self.route, 25)[0], (50, 0, 0))
        self.assertEqual(moving.sample_route(self.route, 75)[0], (100, -50, 0))
        self.assertEqual(moving.sample_route(self.route, 105)[0], (100, -100, 0))
        self.assertEqual(moving.sample_route(self.route, 135)[0], (100, -50, 0))
        self.assertAlmostEqual(moving.sample_route(self.route, 135)[1], math.pi * 2)

    def test_aircraft_trip_gap(self):
        self.route["type"] = "aircraft"
        self.assertFalse(moving.sample_route(self.route, 105)[2])
        self.assertTrue(moving.sample_route(self.route, 135)[2])

    def test_unknown_or_dry_corridor_fails_closed(self):
        self.assertFalse(moving.navigable(self.route, None, lambda x, z: -10, 0))
        self.assertFalse(
            moving.navigable(
                self.route, lambda x, z: 2 if 40 < x < 60 else -10, lambda x, z: -10, 0
            )
        )
        self.assertTrue(moving.navigable(self.route, lambda x, z: -10, lambda x, z: -10, 0))

    def test_connection_sill_is_never_averaged_into_deep_water(self):
        encoded = np.rint((np.array([[0.22, -8], [-8, -8]]) + 512) * 100).astype(np.uint16)
        pixels = np.stack(
            (encoded >> 8, encoded & 255, np.zeros_like(encoded), np.full_like(encoded, 255)),
            axis=-1,
        ).astype(np.uint8)
        height = moving.pixel_sampler(pixels, [0, 0, 20, 20])
        connection = moving.pixel_sampler(pixels, [0, 0, 20, 20], conservative=True)
        self.assertLess(height(7.5, 7.5), 0)
        self.assertAlmostEqual(connection(7.5, 7.5), 0.22)
        pixels[1, 1, 2] = 255
        self.assertIsNone(connection(7.5, 7.5))
        pixels[1, 1, 2] = 0
        pixels[1, 1, 3] = 0
        self.assertIsNone(connection(7.5, 7.5))
        self.assertIsNone(connection(-1, 5))

    def test_route_appears_at_its_first_safe_tide_without_bypassing_unknowns(self):
        levels = [-2.5, -1.5, 0, 1.5, 2]
        self.assertEqual(
            moving.minimum_safe_tide(self.route, lambda x, z: -10, lambda x, z: -2, levels), -1.5
        )
        self.assertIsNone(
            moving.minimum_safe_tide(
                self.route, lambda x, z: -10, lambda x, z: None if 40 < x < 60 else -2, levels
            )
        )


if __name__ == "__main__":
    unittest.main()
