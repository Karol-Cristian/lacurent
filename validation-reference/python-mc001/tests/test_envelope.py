from __future__ import annotations

import unittest

from mc001_reference.envelope import calculate_envelope


class EnvelopeTests(unittest.TestCase):
    def test_htr_manual_spot_check(self):
        assemblies = {
            "wall": {"u_value_w_m2k": 0.5, "u_value_origin": "explicit_direct_u_value"},
            "floor": {"u_value_w_m2k": 0.8, "u_value_origin": "explicit_direct_u_value"},
        }
        result = calculate_envelope({
            "elements": [
                {"element_id": "wall", "element_type": "wall", "boundary_type": "outside_air", "assembly_id": "wall", "area_m2": 100},
                {"element_id": "floor", "element_type": "floor", "boundary_type": "ground", "assembly_id": "floor", "area_m2": 50, "boundary_correction_factor": 0.5},
            ],
            "linear_bridges": [
                {"bridge_id": "corner", "component": "Hd", "length_m": 10, "psi_w_mk": 0.1},
            ],
            "point_bridges": [
                {"bridge_id": "anchor", "component": "Hd", "chi_w_k": 0.25},
            ],
        }, assemblies)
        expected_hd = 0.5 * 100 + 10 * 0.1 + 0.25
        expected_hg = 0.8 * 50 * 0.5
        self.assertAlmostEqual(result["components"]["Hd"]["total_w_k"], expected_hd, places=12)
        self.assertAlmostEqual(result["htr_w_k"], expected_hd + expected_hg, places=12)


if __name__ == "__main__":
    unittest.main()

