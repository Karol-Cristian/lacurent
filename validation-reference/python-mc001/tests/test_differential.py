from __future__ import annotations

import unittest

from common import fixture_path
from compare_results import run_three_way_for_fixture


class DifferentialTests(unittest.TestCase):
    def test_three_way_comparison_all_fixtures(self):
        for fixture_name in ("rb001.json", "rb002.json", "rb003.json"):
            result = run_three_way_for_fixture(fixture_path(fixture_name))
            self.assertEqual(result["status"], "PASS")
            self.assertEqual(len(result["comparisons"]), 3)
            self.assertTrue(all(item["failure_count"] == 0 for item in result["comparisons"]))


if __name__ == "__main__":
    unittest.main()

