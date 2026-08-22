from __future__ import annotations

import unittest

from mc001_reference.chapter3_ventilation import (
    ahu_cooling_coil_required_energy_kwh,
    ahu_dehumidification_cooling_energy_kwh,
    ahu_distribution_thermal_loss_kwh,
    ahu_generation_loss_conditioned_kwh,
    ahu_heat_recovery_energy_kwh,
    ahu_heating_coil_required_energy_kwh,
    ahu_leakage_factor,
    ahu_humidification_generator_input_energy_kwh,
    ahu_non_steam_humidification_auxiliary_energy_kwh,
    ahu_recirculation_air_heating_energy_kwh,
    ahu_recoverable_distribution_loss_to_zone_kwh,
    ahu_recoverable_generation_loss_kwh,
    balanced_residential_fan_temperature_rise_k,
    duct_leakage_air_flow_m3_h,
    duct_leakage_factor,
    extract_air_temperature_for_recovery_c,
    fan_efficiency_from_nominal_and_airflow_factor,
    fan_energy_assigned_to_heat_recovery_pressure_kwh,
    fan_temperature_rise_k,
    ground_preheat_precool_energy_kwh,
    humidification_pump_auxiliary_energy_kwh,
    multizone_constant_pressure_drop_pa,
    multizone_minimum_pressure_drop_pa,
    no_heat_recovery_auxiliary_energy_kwh,
    no_preheater_energy_kwh,
    preheater_energy_kwh,
    pump_heat_recovery_auxiliary_energy_kwh,
    quadratic_pressure_drop_pa,
    required_extract_distribution_air_flow_m3_h,
    required_supply_distribution_air_flow_m3_h,
    rotary_heat_recovery_auxiliary_energy_kwh,
    steam_humidification_pump_auxiliary_energy_kwh,
    duct_leakage_flow_from_factor_m3_h,
    extract_air_flow_zone_allocation_m3_h,
    maximum_flow_factor_from_part_load,
    maximum_zone_flow_factor,
    part_load_ahu_air_flow_m3_h,
    supply_air_flow_zone_allocation_m3_h,
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

    def test_ahu_thermal_relations_reference_case(self):
        heating_coil = ahu_heating_coil_required_energy_kwh(1.2, 1.006, 3000, 18, 2, -4, 1)
        heat_recovery = ahu_heat_recovery_energy_kwh(
            1.2,
            1.006,
            2500,
            3000,
            0.4,
            12,
            -5,
            0.006,
            0.004,
            1,
        )
        recirculation = ahu_recirculation_air_heating_energy_kwh(
            1.2,
            1.006,
            2800,
            0.4,
            20,
            -5,
            2,
        )
        cooling_coil = ahu_cooling_coil_required_energy_kwh(
            1.2,
            1.006,
            2500,
            3000,
            26,
            16,
            0.011,
            0.008,
            1,
        )
        dehumidification = ahu_dehumidification_cooling_energy_kwh(
            1.2,
            1.006,
            2500,
            3000,
            26,
            20,
            16,
            0.011,
            0.001,
            0.008,
            1,
        )
        humidification = ahu_humidification_generator_input_energy_kwh(
            1.2,
            2500,
            3000,
            0.007,
            0.004,
            1,
        )
        generation_loss = ahu_generation_loss_conditioned_kwh(
            0.02,
            28,
            0.015,
            22,
            20,
            50,
            1.2,
            1.006,
            10,
        )

        self.assertAlmostEqual(heating_coil, 1.2 * 1.006 * 3000 * 24 / 3600, places=12)
        self.assertAlmostEqual(
            heat_recovery,
            ((1.2 * 1.006 * 3000 * 0.4 * 17) + (1.2 * 2500 * 3000 * 0.4 * 0.002)) / 3600,
            places=12,
        )
        self.assertAlmostEqual(recirculation, 1.2 * 1.006 * 2800 * 0.6 * 25 * 2 / 3600, places=12)
        self.assertAlmostEqual(
            cooling_coil,
            ((1.2 * 1.006 * 3000 * 10) + (1.2 * 2500 * 3000 * 0.003)) / 3600,
            places=12,
        )
        self.assertAlmostEqual(
            dehumidification,
            ((1.2 * 1.006 * 3000 * 4) + (1.2 * 2500 * 3000 * 0.002)) / 3600,
            places=12,
        )
        self.assertAlmostEqual(humidification, 3000 * 1.2 * 2500 * 0.003 / 3600, places=12)
        self.assertEqual(ahu_non_steam_humidification_auxiliary_energy_kwh(), 0)
        self.assertAlmostEqual(
            generation_loss,
            ((0.02 * 8 + 0.015 * 2) + (50 * 1.2 * 1.006 * 8 / 3600)) * 10,
            places=12,
        )
        self.assertAlmostEqual(
            ahu_recoverable_generation_loss_kwh(generation_loss, "conditioned"),
            generation_loss,
            places=12,
        )
        self.assertEqual(ahu_recoverable_generation_loss_kwh(generation_loss, "unconditioned"), 0)

    def test_ahu_distribution_loss_and_zone_recovery_reference_case(self):
        distribution_loss = ahu_distribution_thermal_loss_kwh(
            1.2,
            1.006,
            1200,
            3,
            [1.2, 0.8],
            900,
            1.5,
            [(50, 19), (30, 20)],
            40,
            16,
            24,
            10,
        )
        recoverable = ahu_recoverable_distribution_loss_to_zone_kwh(
            1.2,
            1.006,
            500,
            2.2,
            25,
            16,
            20,
            10,
        )

        airflow_temperature_sum = 1200 * (3 + 1.2 + 0.8) + 900 * 1.5
        airflow_temperature_sum += 50 * (16 - 19) + 30 * (16 - 20) + 40 * (16 - 24)
        zone_sum = 500 * 2.2 + 25 * (16 - 20)
        self.assertAlmostEqual(
            distribution_loss,
            1.2 * 1.006 * airflow_temperature_sum * 10 / 3600,
            places=12,
        )
        self.assertAlmostEqual(
            recoverable,
            1.2 * 1.006 * zone_sum * 10 / 3600,
            places=12,
        )

    def test_ahu_fan_pressure_leakage_and_airflow_relations_reference_case(self):
        self.assertEqual(balanced_residential_fan_temperature_rise_k(), 0)
        self.assertAlmostEqual(
            fan_temperature_rise_k(200, 1, 1.2, 1.006, 0.5),
            200 / (1.2 * 1.006 * 0.5 * 3.6 * 10**6),
            places=12,
        )
        self.assertAlmostEqual(
            extract_air_temperature_for_recovery_c("upstream_of_recovery", 21, 0.5),
            21.5,
            places=12,
        )
        self.assertEqual(extract_air_temperature_for_recovery_c("downstream_of_recovery", 21, 0.5), 21)
        self.assertAlmostEqual(
            fan_efficiency_from_nominal_and_airflow_factor(0.6, 0.9),
            0.54,
            places=12,
        )
        self.assertAlmostEqual(quadratic_pressure_drop_pa(200, 150, 300), 200 * (150 / 300) ** 2, places=12)
        self.assertAlmostEqual(
            multizone_constant_pressure_drop_pa(200, 150, 300, 0.2),
            200 * ((1 - 0.2) * (150 / 300) ** 2 + 0.2),
            places=12,
        )
        self.assertAlmostEqual(
            multizone_minimum_pressure_drop_pa(200, 150, 300, 0.2, 0.7),
            200 * ((1 - 0.2) * (150 / 300) ** 2 + 0.2 * 0.7**2),
            places=12,
        )
        self.assertAlmostEqual(
            ground_preheat_precool_energy_kwh(1.2, 1.006, 3000, 0.4, 4, -4, 2),
            1.2 * 1.006 * 3000 * 0.4 * 8 * 2 / 3600,
            places=12,
        )
        self.assertAlmostEqual(
            fan_energy_assigned_to_heat_recovery_pressure_kwh(12, 60, 220, 180),
            12 * 60 / (220 + 180),
            places=12,
        )
        self.assertEqual(steam_humidification_pump_auxiliary_energy_kwh(), 0)
        self.assertAlmostEqual(
            humidification_pump_auxiliary_energy_kwh(2000, 0.00002, 0.5, 120),
            2000 * 0.00002 * 0.5 * 120,
            places=12,
        )
        self.assertAlmostEqual(duct_leakage_factor(15, 300), 1 + 15 / 300, places=12)
        self.assertAlmostEqual(
            duct_leakage_air_flow_m3_h(20, 0.00001, 100, 0.65),
            20 * 0.00001 * 100**0.65 * 3600,
            places=12,
        )
        self.assertAlmostEqual(
            ahu_leakage_factor(10, 300, 250, 400),
            1 + (10 / 300) * (250 / 400) ** 0.65,
            places=12,
        )
        self.assertAlmostEqual(
            required_supply_distribution_air_flow_m3_h([(1.05, 100), (1.1, 200)]),
            1.05 * 100 + 1.1 * 200,
            places=12,
        )
        self.assertAlmostEqual(
            required_extract_distribution_air_flow_m3_h([(1.05, 100), (1.1, 200)]),
            -(1.05 * 100 + 1.1 * 200),
            places=12,
        )

    def test_ahu_zone_airflow_and_part_load_reference_case(self):
        zone_allocation = 325 * 100 / 300
        self.assertAlmostEqual(
            supply_air_flow_zone_allocation_m3_h(325, 100, 300),
            zone_allocation,
            places=12,
        )
        self.assertAlmostEqual(
            extract_air_flow_zone_allocation_m3_h(-325, 100, 300),
            zone_allocation,
            places=12,
        )
        self.assertAlmostEqual(
            duct_leakage_flow_from_factor_m3_h(1.05, zone_allocation),
            (1.05 - 1) * zone_allocation,
            places=12,
        )
        self.assertAlmostEqual(
            maximum_zone_flow_factor([(100, 200), (150, 250)]),
            150 / 250,
            places=12,
        )
        self.assertAlmostEqual(part_load_ahu_air_flow_m3_h(0.6, 500), 0.6 * 500, places=12)
        self.assertAlmostEqual(maximum_flow_factor_from_part_load(0.6, 0.15), 0.75, places=12)


if __name__ == "__main__":
    unittest.main()
