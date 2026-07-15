from __future__ import annotations

import unittest

from mc001_reference.cooling import cooling_need, eta_cht


class MonthlyCoolingTests(unittest.TestCase):
    def test_cooling_standard_branch(self):
        result = cooling_need(800, 1600, {
            "effective_internal_heat_capacity_j_k": 18_000_000,
            "total_heat_transfer_coefficient_w_k": 100,
            "a_c0": 1,
            "tau_c0": 15,
        }, 1)
        self.assertEqual(result["cooling_branch"], "figure_2_19_cooling_utilized_transfer_branch")
        self.assertGreater(result["q_cnd_kwh"], 0)

    def test_inverse_gamma_boundary_branch(self):
        result = cooling_need(1000, 200, {
            "effective_internal_heat_capacity_j_k": 18_000_000,
            "total_heat_transfer_coefficient_w_k": 100,
            "a_c0": 1,
            "tau_c0": 15,
        }, 1)
        self.assertEqual(result["cooling_branch"], "inverse_gammaC_greater_than_two_zero_demand")
        self.assertEqual(result["q_cnd_kwh"], 0)

    def test_eta_cht_gamma_equal_one_branch(self):
        self.assertAlmostEqual(eta_cht(1.0, 4.0)["eta_cht"], 0.8, places=12)


if __name__ == "__main__":
    unittest.main()
