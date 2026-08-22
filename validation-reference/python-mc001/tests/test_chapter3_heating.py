from __future__ import annotations

import math
import unittest

from mc001_reference.chapter3_heating import (
    generator_auxiliary_energy_kwh,
    generator_auxiliary_power_high_load_kw,
    generator_auxiliary_power_low_load_kw,
    generator_auxiliary_recoverable_fraction,
    generator_auxiliary_recoverable_loss_kwh,
    generator_auxiliary_recovered_loss_kwh,
    generation_loss_total_kwh,
    generator_envelope_recoverable_loss_kwh,
    generator_loss_energy_kwh,
    generator_loss_power_high_load_kw,
    generator_loss_power_low_load_kw,
    generator_standby_loss_power_kw,
    heating_generation_auxiliary_total_kwh,
    heating_generator_fuel_input_energy_kwh,
    heating_distribution_auxiliary_energy_kwh,
    heating_distribution_auxiliary_recoverable_kwh,
    heating_distribution_auxiliary_recovered_kwh,
    heating_distribution_boost_pump_energy_kwh,
    heating_distribution_setback_pump_energy_kwh,
    heating_emission_loss_kwh,
    heating_generator_load_factor,
    hydronic_design_power_kw,
    hydronic_pressure_drop_kpa,
    hydronic_pump_energy_kwh,
    hydronic_pump_energy_use_factor,
    hydronic_reference_pump_power_kw,
    intermediate_load_factor,
    recoverable_generation_loss_total_kwh,
    shared_generator_reference_case,
    subsystem_input_energy_kwh,
    total_generation_auxiliary_recovered_loss_kwh,
    central_generator_output_energy_kwh,
)


class Chapter3HeatingReferenceTests(unittest.TestCase):
    def test_emission_and_pump_reference_chain(self):
        qhnd = 1000
        emission_loss = heating_emission_loss_kwh(qhnd, 1.25, 20, -5)
        pressure_drop = hydronic_pressure_drop_kpa(0.2, 0.05, 35, 6)
        design_power = hydronic_design_power_kw(pressure_drop, 1.6)
        reference_power = hydronic_reference_pump_power_kw(design_power)
        use_factor = hydronic_pump_energy_use_factor(
            reference_power,
            design_power,
            0.25,
            0.75,
            0.5,
            0.23,
        )
        pump_energy = hydronic_pump_energy_kwh(design_power, 0.5, 120, 1.1)
        auxiliary = heating_distribution_auxiliary_energy_kwh(pump_energy, use_factor)
        setback = heating_distribution_setback_pump_energy_kwh(0.03, 40)
        boost = heating_distribution_boost_pump_energy_kwh(design_power, 5)
        total_auxiliary = auxiliary + setback + boost

        expected_pressure_drop = (1 + 0.2) * 0.05 * 35 + 6
        expected_design_power = expected_pressure_drop * 1.6 / 3600
        expected_reference = (
            1.7 * expected_design_power
            + 17 * (1 - math.exp(-0.3 * expected_design_power))
        ) * 10**-3
        expected_use = expected_reference / expected_design_power
        expected_use *= (0.25 + 0.75 * 0.5**-1) * 0.23 / 0.25

        self.assertAlmostEqual(emission_loss, qhnd * 1.25 / 25, places=12)
        self.assertAlmostEqual(pressure_drop, expected_pressure_drop, places=12)
        self.assertAlmostEqual(design_power, expected_design_power, places=12)
        self.assertAlmostEqual(reference_power, expected_reference, places=12)
        self.assertAlmostEqual(use_factor, expected_use, places=12)
        self.assertAlmostEqual(
            auxiliary,
            expected_design_power * 0.5 * 120 * 1.1 * expected_use,
            places=12,
        )
        self.assertAlmostEqual(
            setback,
            0.3 * 0.03 * 40,
            places=12,
        )
        self.assertAlmostEqual(
            boost,
            3.3 * expected_design_power * 5,
            places=12,
        )
        self.assertAlmostEqual(
            heating_distribution_auxiliary_recoverable_kwh(0.3, total_auxiliary),
            total_auxiliary * 0.3,
            places=12,
        )
        self.assertAlmostEqual(
            heating_distribution_auxiliary_recovered_kwh(0.3, total_auxiliary),
            total_auxiliary * 0.7,
            places=12,
        )

    def test_generator_loss_and_auxiliary_low_load_reference_chain(self):
        output = 900
        beta = heating_generator_load_factor(output, 24, 120)
        beta_pint = intermediate_load_factor(8, 24)
        loss_power = generator_loss_power_low_load_kw(beta, beta_pint, 1.2, 0.4)
        loss_energy = generator_loss_energy_kwh(loss_power, 120)
        standby = generator_standby_loss_power_kw(1.5, 0.5, 24)
        envelope_recoverable = generator_envelope_recoverable_loss_kwh(
            standby,
            0.1,
            0.2,
            120,
        )
        aux_power = generator_auxiliary_power_low_load_kw(beta, beta_pint, 0.08, 0.02)
        aux_energy = generator_auxiliary_energy_kwh(aux_power, 120)
        recoverable_fraction = generator_auxiliary_recoverable_fraction(0.25)

        expected_loss_power = beta / beta_pint * (1.2 - 0.4) + 0.4
        expected_aux_power = beta / beta_pint * (0.08 - 0.02) + 0.02

        self.assertLessEqual(beta, beta_pint)
        self.assertAlmostEqual(loss_power, expected_loss_power, places=12)
        self.assertAlmostEqual(loss_energy, expected_loss_power * 120, places=12)
        self.assertAlmostEqual(standby, ((1.5 + 0.5) / 100) * 24, places=12)
        self.assertAlmostEqual(envelope_recoverable, standby * 0.9 * 0.2 * 120, places=12)
        self.assertAlmostEqual(aux_power, expected_aux_power, places=12)
        self.assertAlmostEqual(aux_energy, expected_aux_power * 120, places=12)
        self.assertAlmostEqual(recoverable_fraction, 0.75, places=12)
        self.assertAlmostEqual(
            generator_auxiliary_recovered_loss_kwh(aux_energy, 0.25),
            aux_energy * 0.25,
            places=12,
        )
        self.assertAlmostEqual(
            generator_auxiliary_recoverable_loss_kwh(aux_energy, 0.1, recoverable_fraction),
            aux_energy * 0.9 * 0.75,
            places=12,
        )

    def test_generator_loss_and_auxiliary_high_load_reference_chain(self):
        output = 1600
        beta = heating_generator_load_factor(output, 24, 120)
        beta_pint = intermediate_load_factor(8, 24)
        loss_power = generator_loss_power_high_load_kw(beta, beta_pint, 1, 1.2, 0.4)
        aux_power = generator_auxiliary_power_high_load_kw(beta, beta_pint, 0.12, 0.08)

        expected_loss_power = ((beta - beta_pint) / (1 - beta_pint)) * (1.2 - 0.4) + 0.4
        expected_aux_power = ((beta - beta_pint) / (1 - beta_pint)) * (0.12 - 0.08) + 0.08

        self.assertGreater(beta, beta_pint)
        self.assertAlmostEqual(loss_power, expected_loss_power, places=12)
        self.assertAlmostEqual(aux_power, expected_aux_power, places=12)

    def test_subsystem_balance_uses_recovery_signs(self):
        self.assertAlmostEqual(
            subsystem_input_energy_kwh(1000, 50, 12, 0.25, 0.1),
            1000 + 50 - 12 * 0.25 - 50 * 0.1,
            places=12,
        )

    def test_shared_heating_dhw_generator_reference_case(self):
        self.assertAlmostEqual(
            central_generator_output_energy_kwh(1.05, [103], [53]),
            161.15,
            places=12,
        )
        self.assertAlmostEqual(
            heating_generation_auxiliary_total_kwh([3.25], [1.75]),
            5,
            places=12,
        )
        self.assertAlmostEqual(
            generation_loss_total_kwh(13, [7], 0),
            20,
            places=12,
        )
        self.assertAlmostEqual(
            total_generation_auxiliary_recovered_loss_kwh(0.65, [0.35]),
            1,
            places=12,
        )
        self.assertAlmostEqual(
            recoverable_generation_loss_total_kwh(3.9, [2.1], 2.25),
            8.25,
            places=12,
        )
        self.assertAlmostEqual(
            heating_generator_fuel_input_energy_kwh(161.15, 1, 20, 0),
            180.15,
            places=12,
        )
        reference = shared_generator_reference_case()
        self.assertAlmostEqual(reference["output_kwh"], 161.15, places=12)
        self.assertAlmostEqual(reference["fuel_input_kwh"], 180.15, places=12)
        self.assertAlmostEqual(reference["heating_allocated_kwh"], 120.3475, places=12)
        self.assertAlmostEqual(reference["dhw_allocated_kwh"], 64.8025, places=12)
        self.assertAlmostEqual(
            reference["heating_allocated_kwh"] + reference["dhw_allocated_kwh"],
            reference["fuel_input_kwh"] + reference["auxiliary_kwh"],
            places=12,
        )


if __name__ == "__main__":
    unittest.main()
