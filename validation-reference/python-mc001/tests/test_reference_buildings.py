from __future__ import annotations

import unittest

from common import expected_path, fixture_path, load_json
from mc001_reference.calculator import calculate_fixture_file


class ReferenceBuildingTests(unittest.TestCase):
    def test_three_full_reference_buildings_exist(self):
        for name in ("rb001.json", "rb002.json", "rb003.json"):
            fixture = load_json(fixture_path(name))
            self.assertEqual(fixture["fixture_status"], "full_reference_building")
            self.assertEqual(len(fixture["monthly"]), 12)

    def test_python_matches_committed_fixed_expected(self):
        for fixture_name, expected_name in (
            ("rb001.json", "rb001_expected.json"),
            ("rb002.json", "rb002_expected.json"),
            ("rb003.json", "rb003_expected.json"),
        ):
            result = calculate_fixture_file(fixture_path(fixture_name), engine="fixed_expected")
            expected = load_json(expected_path(expected_name))
            self.assertEqual(result, expected)

    def test_building_diversity(self):
        rb001 = calculate_fixture_file(fixture_path("rb001.json"))
        rb002 = calculate_fixture_file(fixture_path("rb002.json"))
        rb003 = calculate_fixture_file(fixture_path("rb003.json"))
        self.assertGreater(rb002["envelope"]["htr_w_k"], rb001["envelope"]["htr_w_k"])
        self.assertGreater(rb002["annual"]["q_hnd_kwh"], rb001["annual"]["q_hnd_kwh"])
        self.assertGreater(rb003["annual"]["q_cnd_kwh"], 0)


if __name__ == "__main__":
    unittest.main()

