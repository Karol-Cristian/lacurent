from __future__ import annotations

import unittest

from mc001_reference.heating import heating_need, eta_hgn, time_constant_hours
from mc001_reference.transmission import monthly_transmission


class MonthlyHeatingTests(unittest.TestCase):
    def test_monthly_transmission_manual_spot_check(self):
        self.assertAlmostEqual(monthly_transmission(100, 20, 0, 744), 1488.0, places=12)

    def test_heating_standard_branch(self):
        result = heating_need(1000, 300, {
            "effective_internal_heat_capacity_j_k": 18_000_000,
            "total_heat_transfer_coefficient_w_k": 100,
            "a_h0": 1,
            "tau_h0": 15,
        })
        self.assertEqual(result["heating_branch"], "figure_2_18_standard_balance")
        self.assertGreater(result["q_hnd_kwh"], 0)
        self.assertIsNotNone(result["eta_hgn"])

    def test_eta_hgn_gamma_equal_one_branch(self):
        self.assertAlmostEqual(eta_hgn(1.0, 4.0)["eta_hgn"], 0.8, places=12)

    def test_time_constant_units(self):
        self.assertAlmostEqual(time_constant_hours(18_000_000, 100), 50.0, places=12)


if __name__ == "__main__":
    unittest.main()

