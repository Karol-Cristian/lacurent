from __future__ import annotations

import math
import unittest

from mc001_reference.chapter3_dhw import (
    auxiliary_distribution_energy_kwh,
    distribution_loss_with_recirculation,
    insulated_pipe_linear_transmittance,
    pump_design_power_kw,
    pump_energy_use_factor,
    recirculation_pump_energy_kwh,
    reference_pump_power_kw,
    storage_standing_loss_single_volume_kwh,
)


class Chapter3DhwReferenceTests(unittest.TestCase):
    def test_distribution_pipe_loss_reference_case(self):
        psi = insulated_pipe_linear_transmittance(0.02, 0.04, 0.04, 8)
        expected_psi = math.pi / (
            (1 / (2 * 0.04)) * math.log(0.04 / 0.02) + 1 / (8 * 0.04)
        )
        self.assertAlmostEqual(psi, expected_psi, places=12)
        self.assertAlmostEqual(
            distribution_loss_with_recirculation(psi, 50, 20, 12, 0, 100),
            expected_psi * (50 - 20) * 12 * 100 / 1000,
            places=12,
        )

    def test_recirculation_pump_auxiliary_reference_case(self):
        design_power = pump_design_power_kw(18, 0.8)
        reference_power = reference_pump_power_kw(design_power)
        efficiency_factor = reference_power / design_power
        energy_use_factor = pump_energy_use_factor(
            efficiency_factor,
            0.25,
            0.75,
            0.5,
            0.23,
        )
        pump_energy = recirculation_pump_energy_kwh(design_power, 0.5, 100, 1.1)
        auxiliary = auxiliary_distribution_energy_kwh(pump_energy, energy_use_factor)
        expected_reference = (
            1.7 * design_power + 17 * (1 - math.exp(-0.3 * design_power))
        ) * 10**-3
        expected_factor = expected_reference / design_power
        expected_use_factor = expected_factor * (0.25 + 0.75 * 0.5**-1) * 0.23 / 0.25
        self.assertAlmostEqual(reference_power, expected_reference, places=12)
        self.assertAlmostEqual(energy_use_factor, expected_use_factor, places=12)
        self.assertAlmostEqual(auxiliary, design_power * 0.5 * 100 * 1.1 * expected_use_factor, places=12)

    def test_storage_standing_loss_reference_case(self):
        self.assertAlmostEqual(
            storage_standing_loss_single_volume_kwh(0.8, 1.1, 3, 55, 20, 744),
            0.8 * 1.1 * (3 / 1000) * (55 - 20) * 744,
            places=12,
        )


if __name__ == "__main__":
    unittest.main()
