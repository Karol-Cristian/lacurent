from __future__ import annotations

import unittest

from sensitivity import run_sensitivity_pack


class MetamorphicTests(unittest.TestCase):
    def test_sensitivity_pack(self):
        result = run_sensitivity_pack()
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["mutation_count"], 10)
        for mutation in result["mutations"]:
            self.assertEqual(mutation["engines"]["python"]["status"], "PASS")
            self.assertEqual(mutation["engines"]["javascript"]["status"], "PASS")
            self.assertEqual(mutation["engines"]["python"]["applicability_stability"], "PASS")
            self.assertEqual(mutation["engines"]["javascript"]["applicability_stability"], "PASS")


if __name__ == "__main__":
    unittest.main()
