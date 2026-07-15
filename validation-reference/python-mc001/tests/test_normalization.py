from __future__ import annotations

import unittest

from common import REPO_ROOT, fixture_path, run_command_json


class NormalizationTests(unittest.TestCase):
    def test_lacurent_runtime_runner_outputs_normalized_schema(self):
        result = run_command_json([
            "node",
            "validation-reference/python-mc001/compare/run_lacurent_runtime.mjs",
            str(fixture_path("rb001.json")),
        ], cwd=REPO_ROOT)
        self.assertEqual(result["engine"], "lacurent_runtime")
        self.assertEqual(result["schema"], "p3v.normalized.v1")
        self.assertEqual(len(result["monthly"]), 12)
        self.assertIn("q_hnd_kwh", result["annual"])

    def test_lacurent_runtime_preserves_branch_identifiers(self):
        result = run_command_json([
            "node",
            "validation-reference/python-mc001/compare/run_lacurent_runtime.mjs",
            str(fixture_path("rb003.json")),
        ], cwd=REPO_ROOT)
        cooling_months = [month for month in result["monthly"] if month["q_cnd_kwh"] > 0]
        self.assertTrue(cooling_months)
        self.assertTrue(all(month["cooling_branch"] == "figure_2_19_cooling_utilized_transfer_branch" for month in cooling_months))


if __name__ == "__main__":
    unittest.main()

