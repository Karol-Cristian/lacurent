from __future__ import annotations

import unittest

from mc001_reference.chapter3_cooling import (
    cooling_compression_eer,
    cooling_compression_electric_input_kwh,
    cooling_control_auxiliary_kwh,
    cooling_distribution_auxiliary_kwh,
    cooling_distribution_loss_kwh,
    cooling_generator_auxiliary_total_kwh,
    cooling_generator_input_by_capacity_limit,
    cooling_heat_rejected_compression_kwh,
    cooling_heat_rejection_auxiliary_kwh,
    cooling_heat_rejection_distribution_auxiliary_kwh,
    cooling_part_load_bin,
    cooling_part_load_factor,
    cooling_storage_auxiliary_kwh,
    cooling_storage_auxiliary_total_kwh,
    cooling_storage_pump_operation_hours,
    cooling_storage_recoverable_auxiliary_loss_kwh,
    cooling_storage_recoverable_loss_total_kwh,
    cooling_storage_recoverable_thermal_loss_kwh,
    cooling_storage_thermal_loss_kwh,
)


class Chapter3CoolingReferenceTests(unittest.TestCase):
    def test_distribution_storage_and_generator_reference_chain(self):
        useful = 100
        emission_loss = 5
        ahu_output = 20
        distribution_loss = cooling_distribution_loss_kwh(0.05, useful, emission_loss, ahu_output)
        distribution_aux = cooling_distribution_auxiliary_kwh(0.02, useful, emission_loss, ahu_output)
        distribution_input = useful + emission_loss + distribution_loss

        output_loss = cooling_storage_thermal_loss_kwh(0.01, 30, 10, 100)
        standby_loss = cooling_storage_thermal_loss_kwh(0.01, 30, 10, 100)
        input_loss = cooling_storage_thermal_loss_kwh(0.01, 30, 10, 100)
        output_hours = cooling_storage_pump_operation_hours(
            distribution_input,
            0.00116,
            1000,
            2,
            6,
            11,
        )
        output_aux = cooling_storage_auxiliary_kwh(output_hours, 0.1)
        storage_aux = cooling_storage_auxiliary_total_kwh(output_aux, 0)
        storage_aux_recoverable = cooling_storage_recoverable_auxiliary_loss_kwh(storage_aux, 0.2)
        storage_thermal_recoverable = cooling_storage_recoverable_thermal_loss_kwh(
            output_loss,
            standby_loss,
            input_loss,
            0.25,
        )
        recoverable_total = cooling_storage_recoverable_loss_total_kwh(
            storage_aux_recoverable,
            storage_thermal_recoverable,
        )

        generator_required = distribution_input + output_loss + standby_loss + input_loss
        load = cooling_part_load_factor(generator_required, 240, 20)
        part_load = cooling_part_load_bin(load)
        generator_input = cooling_generator_input_by_capacity_limit(generator_required, 240, 20)
        compression = cooling_compression_electric_input_kwh(generator_input, part_load, 3, 1)
        heat_rejected = cooling_heat_rejected_compression_kwh(generator_input, 3, part_load, 1)
        heat_rejection_aux = cooling_heat_rejection_auxiliary_kwh(heat_rejected, 0.018, 0.8, 1)
        heat_rejection_distribution_aux = cooling_heat_rejection_distribution_auxiliary_kwh(
            heat_rejected,
            0.003,
        )
        control_aux = cooling_control_auxiliary_kwh(240, [0.02])
        generator_aux = cooling_generator_auxiliary_total_kwh(
            heat_rejection_aux,
            heat_rejection_distribution_aux,
            control_aux,
        )
        effective_eer = cooling_compression_eer(generator_input, compression, generator_aux)

        self.assertAlmostEqual(distribution_loss, 0.05 * 125, places=12)
        self.assertAlmostEqual(distribution_aux, 0.02 * 125, places=12)
        self.assertAlmostEqual(output_loss + standby_loss + input_loss, 60, places=12)
        self.assertAlmostEqual(output_hours, distribution_input / (0.00116 * 1000 * 2 * 5), places=12)
        self.assertAlmostEqual(storage_aux, output_aux, places=12)
        self.assertAlmostEqual(storage_aux_recoverable, -storage_aux * 0.2, places=12)
        self.assertAlmostEqual(storage_thermal_recoverable, -60 * 0.25, places=12)
        self.assertAlmostEqual(recoverable_total, storage_aux_recoverable + storage_thermal_recoverable, places=12)
        self.assertLess(load, 0.05)
        self.assertEqual(part_load, 1)
        self.assertAlmostEqual(generator_input, generator_required, places=12)
        self.assertAlmostEqual(compression, generator_required / 3, places=12)
        self.assertAlmostEqual(heat_rejected, generator_required * (1 + 1 / 3), places=12)
        self.assertAlmostEqual(heat_rejection_aux, heat_rejected * 0.018 * 0.8, places=12)
        self.assertAlmostEqual(heat_rejection_distribution_aux, heat_rejected * 0.003, places=12)
        self.assertAlmostEqual(control_aux, 240 * 0.02, places=12)
        self.assertAlmostEqual(generator_aux, heat_rejection_aux + heat_rejection_distribution_aux + control_aux, places=12)
        self.assertAlmostEqual(effective_eer, generator_input / (compression + generator_aux), places=12)


if __name__ == "__main__":
    unittest.main()
