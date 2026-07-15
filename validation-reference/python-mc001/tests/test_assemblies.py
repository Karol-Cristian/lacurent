from __future__ import annotations

import unittest

from mc001_reference.assemblies import calculate_assembly


class AssemblyTests(unittest.TestCase):
    def test_assembly_manual_spot_check(self):
        materials = {
            "masonry": {"lambda_design_w_mk": 0.618},
            "eps": {"lambda_design_w_mk": 0.04},
        }
        result = calculate_assembly({
            "assembly_id": "wall",
            "assembly_type": "wall",
            "rsi_m2k_w": 0.13,
            "rse_m2k_w": 0.04,
            "layers": [
                {"layer_id": "masonry", "material_id": "masonry", "thickness_m": 0.3},
                {"layer_id": "eps", "material_id": "eps", "thickness_m": 0.1},
            ],
        }, materials)
        expected_r = 0.13 + 0.3 / 0.618 + 0.1 / 0.04 + 0.04
        self.assertAlmostEqual(result["total_resistance_m2k_w"], expected_r, places=12)
        self.assertAlmostEqual(result["u_value_w_m2k"], 1 / expected_r, places=12)

    def test_direct_u_override(self):
        result = calculate_assembly({
            "assembly_id": "window",
            "assembly_type": "window",
            "direct_u_w_m2k": 1.4,
        }, {})
        self.assertEqual(result["branch"], "direct_u_override")
        self.assertAlmostEqual(result["total_resistance_m2k_w"], 1 / 1.4, places=12)


if __name__ == "__main__":
    unittest.main()

