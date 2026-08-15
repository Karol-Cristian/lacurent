from __future__ import annotations

import unittest

from mc001_reference.chapter3_ventilation import (
    no_heat_recovery_auxiliary_energy_kwh,
    no_preheater_energy_kwh,
    preheater_energy_kwh,
    pump_heat_recovery_auxiliary_energy_kwh,
    rotary_heat_recovery_auxiliary_energy_kwh,
    ventilation_control_auxiliary_energy_kwh,
)


class Chapter3VentilationReferenceTests(unittest.TestCase):
    def test_rotary_and_control_auxiliary_reference_case(self):
        self.assertAlmostEqual(
            rotary_heat_recovery_auxiliary_energy_kwh(0.1, 120, 0.5),
            0.1 * 120 * 0.5,
            places=12,
        )
        self.assertAlmostEqual(
            ventilation_control_auxiliary_energy_kwh(0.02, 0.5, 120),
            0.02 * 0.5 * 120,
            places=12,
        )

    def test_pump_heat_recovery_reference_case(self):
        expected_part_load = max(0.2, 60 / (120 * 2))
        self.assertAlmostEqual(
            pump_heat_recovery_auxiliary_energy_kwh(300, 0.8, 0.0004, 120, 0.2, 60, 2),
            300 * 0.8 * 0.0004 * 120 * expected_part_load**2.5,
            places=12,
        )

    def test_preheater_and_zero_branches(self):
        self.assertAlmostEqual(
            preheater_energy_kwh(1.2, 1.0, 300, 0.8, 2, -5, 120),
            1.2 * 1.0 * 300 * 0.8 * (2 - (-5)) * 120 / 3600,
            places=12,
        )
        self.assertEqual(no_preheater_energy_kwh(), 0)
        self.assertEqual(no_heat_recovery_auxiliary_energy_kwh(), 0)


if __name__ == "__main__":
    unittest.main()
