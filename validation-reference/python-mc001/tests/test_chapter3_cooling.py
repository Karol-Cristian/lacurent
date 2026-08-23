from __future__ import annotations

import unittest

from mc001_reference.chapter3_cooling import (
    cooling_absorption_heat_input_kwh,
    cooling_absorption_multi_carrier_input,
    cooling_absorption_part_load_value,
    cooling_absorption_performance_ratio,
    cooling_compression_delivered_electric_input_kwh,
    cooling_compression_eer,
    cooling_compression_electric_input_kwh,
    cooling_control_auxiliary_kwh,
    cooling_distribution_inlet_outdoor_compensated_c,
    cooling_distribution_inlet_constant_setpoint_c,
    cooling_distribution_auxiliary_kwh,
    cooling_distribution_loss_kwh,
    cooling_dry_heat_rejection_water_temperature_c,
    cooling_generator_auxiliary_total_kwh,
    cooling_generator_part_load_value,
    cooling_generator_input_by_capacity_limit,
    cooling_generator_input_required_air_water_kwh,
    cooling_generator_input_required_direct_expansion_kwh,
    cooling_generator_outlet_temperature_c,
    cooling_heat_rejected_after_recovery_kwh,
    cooling_heat_rejected_compression_kwh,
    cooling_heat_rejection_part_load_factor,
    cooling_heat_rejection_auxiliary_kwh,
    cooling_heat_rejection_distribution_auxiliary_kwh,
    cooling_heat_rejection_reference_temperature_c,
    cooling_heat_rejection_temperature_c,
    cooling_recoverable_heat_compression_kwh,
    cooling_recoverable_heat_maximum_temperature_c,
    cooling_recoverable_heat_zero_kwh,
    cooling_water_heat_rejection_inlet_temperature_c,
    cooling_wet_heat_rejection_water_temperature_c,
    cooling_part_load_bin,
    cooling_part_load_factor,
    cooling_extracted_energy_limited_by_generator,
    cooling_unmet_load_kwh,
    cooling_storage_auxiliary_kwh,
    cooling_storage_auxiliary_total_kwh,
    cooling_storage_generator_delta_kwh,
    cooling_storage_ice_mass_variation_kg,
    cooling_storage_ice_thickness_m,
    cooling_storage_initial_ice_thickness_m,
    cooling_storage_input_boundary_kwh,
    cooling_storage_latent_kwh,
    cooling_storage_output_kwh,
    cooling_storage_pcm_limit_to_existing_solid_kg,
    cooling_storage_pcm_limit_to_liquid_kg,
    cooling_storage_pcm_liquid_temperature_c,
    cooling_storage_pcm_solid_mass_variation_kg,
    cooling_storage_pcm_solid_temperature_c,
    cooling_storage_pump_operation_hours,
    cooling_storage_recoverable_auxiliary_loss_kwh,
    cooling_storage_recoverable_loss_total_kwh,
    cooling_storage_recoverable_thermal_loss_kwh,
    cooling_storage_sensible_liquid_kwh,
    cooling_storage_sensible_solid_kwh,
    cooling_storage_solid_mass_after_use_kg,
    cooling_storage_thermal_loss_kwh,
    cooling_storage_transformable_water_kwh,
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
        delivered_electric = cooling_compression_delivered_electric_input_kwh(
            compression,
            generator_aux,
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
        self.assertAlmostEqual(delivered_electric, compression + generator_aux, places=12)
        self.assertAlmostEqual(effective_eer, generator_input / (compression + generator_aux), places=12)

    def test_compression_delivered_electric_input_decreases_with_eer(self):
        generator_required = 166.25
        operation_hours = 240
        nominal_power = 20
        specific_electric_demand = 0.018
        part_load_electric_factor = 0.8
        distribution_specific_electric_demand = 0.003
        control_aux = cooling_control_auxiliary_kwh(operation_hours, [0.02])
        delivered_by_eer = []

        for eer in [2, 3, 4, 5]:
            load = cooling_part_load_factor(generator_required, operation_hours, nominal_power)
            part_load = cooling_part_load_bin(load)
            generator_input = cooling_generator_input_by_capacity_limit(
                generator_required,
                operation_hours,
                nominal_power,
            )
            compression = cooling_compression_electric_input_kwh(
                generator_input,
                part_load,
                eer,
                1,
            )
            heat_rejected = cooling_heat_rejected_compression_kwh(
                generator_input,
                eer,
                part_load,
                1,
            )
            heat_rejection_aux = cooling_heat_rejection_auxiliary_kwh(
                heat_rejected,
                specific_electric_demand,
                part_load_electric_factor,
                1,
            )
            heat_rejection_distribution_aux = cooling_heat_rejection_distribution_auxiliary_kwh(
                heat_rejected,
                distribution_specific_electric_demand,
            )
            generator_aux = cooling_generator_auxiliary_total_kwh(
                heat_rejection_aux,
                heat_rejection_distribution_aux,
                control_aux,
            )
            delivered_by_eer.append(
                cooling_compression_delivered_electric_input_kwh(
                    compression,
                    generator_aux,
                )
            )

        self.assertEqual(len(delivered_by_eer), 4)
        self.assertTrue(all(
            later < earlier
            for earlier, later in zip(delivered_by_eer, delivered_by_eer[1:])
        ), delivered_by_eer)

    def test_pcm_storage_state_reference_chain(self):
        storage_input = cooling_storage_input_boundary_kwh(10)
        sensible_liquid = cooling_storage_sensible_liquid_kwh(
            80,
            0.00116,
            1000,
            0.05,
            0.00116,
            18,
            12,
        )
        latent = cooling_storage_latent_kwh(0.0271, 40)
        sensible_solid = cooling_storage_sensible_solid_kwh(
            40,
            0.000392,
            20,
            32.755102040816325,
        )
        output = cooling_storage_output_kwh(sensible_liquid, latent, sensible_solid, 8, 3)
        transformable_water = cooling_storage_transformable_water_kwh(storage_input, 0.2, 0.3, 0.1)
        initial_ice_thickness = cooling_storage_initial_ice_thickness_m(40, 917, 50, 0.03)
        ice_mass_variation = cooling_storage_ice_mass_variation_kg(
            transformable_water,
            0.0271,
            0.000392,
            20,
            32.755102040816325,
        )
        ice_thickness = cooling_storage_ice_thickness_m(0.04, 0.03, 40, ice_mass_variation, 917, 50)
        solid_after_use = cooling_storage_solid_mass_after_use_kg(40, ice_mass_variation)
        pcm_solid_mass_variation = cooling_storage_pcm_solid_mass_variation_kg(
            transformable_water,
            0.0271,
            0.000392,
            20,
        )
        liquid_limited = cooling_storage_pcm_limit_to_liquid_kg(pcm_solid_mass_variation, 30)
        solid_limited = cooling_storage_pcm_limit_to_existing_solid_kg(pcm_solid_mass_variation, 20)
        pcm_solid_temperature = cooling_storage_pcm_solid_temperature_c(
            8,
            transformable_water,
            0.000392,
            liquid_limited,
            20,
            40,
            32.755102040816325,
        )
        pcm_liquid_temperature = cooling_storage_pcm_liquid_temperature_c(
            18,
            transformable_water,
            0.000392,
            liquid_limited,
            20,
            0.00116,
            30,
        )
        generator_delta = cooling_storage_generator_delta_kwh(7, output, 0.2, 0.3, 0.1)

        self.assertAlmostEqual(storage_input, 10, places=12)
        self.assertAlmostEqual(sensible_liquid, (80 * 0.00116 + 1000 * 0.05 * 0.00116) * 6, places=12)
        self.assertAlmostEqual(latent, 0.0271 * 40, places=12)
        self.assertAlmostEqual(
            sensible_solid,
            40 * 0.000392 * ((20 - 32.755102040816325) / 2),
            places=12,
        )
        self.assertAlmostEqual(output, sensible_liquid + latent + sensible_solid, places=12)
        self.assertAlmostEqual(transformable_water, 10.6, places=12)
        self.assertGreater(initial_ice_thickness, 0)
        self.assertLess(ice_mass_variation, 0)
        self.assertEqual(ice_thickness, 0)
        self.assertEqual(solid_after_use, 0)
        self.assertGreater(pcm_solid_mass_variation, 0)
        self.assertEqual(liquid_limited, 30)
        self.assertEqual(solid_limited, 20)
        self.assertGreater(pcm_solid_temperature, 32.755102040816325)
        self.assertGreater(pcm_liquid_temperature, 18)
        self.assertAlmostEqual(generator_delta, 7 - output - 0.2 - 0.3 - 0.1, places=12)

    def test_cooling_generator_topology_and_heat_rejection_reference_chain(self):
        outlet = cooling_generator_outlet_temperature_c(
            "direct_expansion_air_distribution",
            theta_supply_cooling_required_c=16,
        )
        compensated = cooling_distribution_inlet_outdoor_compensated_c(7, 18, -0.3, 30, 22)
        constant_setpoint = cooling_distribution_inlet_constant_setpoint_c()
        dx_required = cooling_generator_input_required_direct_expansion_kwh(100, 5, 20)
        air_water_required = cooling_generator_input_required_air_water_kwh(
            100,
            5,
            20,
            6.25,
            2.5,
            1,
        )
        reference = cooling_heat_rejection_reference_temperature_c(
            "water",
            water_reference_inlet_c=33,
        )
        theta = cooling_heat_rejection_temperature_c("outdoor_air", outdoor_temperature_c=31)
        rejection_part_load = cooling_heat_rejection_part_load_factor(25, 0.001, -0.02, 1.1)
        rejected = cooling_heat_rejected_compression_kwh(100, 3, 0.9, 1)
        water_inlet = cooling_water_heat_rejection_inlet_temperature_c(
            "variable_temperature",
            27,
            130,
            10,
            20,
            33,
            27,
            25,
        )
        wet = cooling_wet_heat_rejection_water_temperature_c(27, 31, 21, 0.7)
        dry = cooling_dry_heat_rejection_water_temperature_c(32, 36, 30, 0.5)
        recoverable_zero = cooling_recoverable_heat_zero_kwh()
        recoverable = cooling_recoverable_heat_compression_kwh(100, 3, 0.9, 1)
        maximum_temperature = cooling_recoverable_heat_maximum_temperature_c(water_inlet)
        rejected_after_recovery = cooling_heat_rejected_after_recovery_kwh(recoverable, 40)
        absorption_heat = cooling_absorption_heat_input_kwh(100, 0.8, 0.7)
        absorption_ratio = cooling_absorption_performance_ratio(100, absorption_heat)

        self.assertEqual(outlet, 16)
        self.assertEqual(compensated, 13)
        self.assertEqual(constant_setpoint, 6)
        self.assertEqual(dx_required, 125)
        self.assertAlmostEqual(air_water_required, 133.75, places=12)
        self.assertEqual(reference, 33)
        self.assertEqual(theta, 31)
        self.assertAlmostEqual(rejection_part_load, 0.001 * 25**2 - 0.02 * 25 + 1.1, places=12)
        self.assertAlmostEqual(rejected, 100 * (1 + 1 / (3 * 0.9)), places=12)
        self.assertAlmostEqual(water_inlet, 30.9, places=12)
        self.assertEqual(wet, 20)
        self.assertEqual(dry, 29)
        self.assertEqual(recoverable_zero, 0)
        self.assertAlmostEqual(recoverable, rejected, places=12)
        self.assertAlmostEqual(maximum_temperature, water_inlet, places=12)
        self.assertAlmostEqual(rejected_after_recovery, recoverable - 40, places=12)
        self.assertAlmostEqual(absorption_heat, 100 / (0.8 * 0.7), places=12)
        self.assertAlmostEqual(absorption_ratio, 0.56, places=12)

    def test_capacity_limited_cooling_and_absorption_multi_carrier_reference(self):
        generator_required = 10
        generator_available = cooling_generator_input_by_capacity_limit(
            generator_required,
            operation_hours=1,
            nominal_power_kw=1,
        )
        supplied = cooling_extracted_energy_limited_by_generator(
            required_energy_kwh=10,
            generator_input_required_kwh=generator_required,
            generator_input_available_kwh=generator_available,
        )
        unmet = cooling_unmet_load_kwh(10, supplied)

        self.assertEqual(generator_available, 1)
        self.assertEqual(supplied, 1)
        self.assertEqual(unmet, 9)

        heat_rejection_part_load = cooling_heat_rejection_part_load_factor(
            temperature_c=25,
            a2=0.00083,
            a1=-0.07753,
            a0=2.64,
        )
        part_load_value = cooling_generator_part_load_value(
            cooling_part_load_bin_factor=0.3,
            heat_rejection_part_load_factor=heat_rejection_part_load,
            free_cooling_factor=1,
            multiple_generator_factor=1,
        )
        self.assertAlmostEqual(
            part_load_value,
            0.3 * (0.00083 * 25**2 - 0.07753 * 25 + 2.64),
            places=12,
        )

        absorption_part_load = cooling_absorption_part_load_value()
        absorption_heat = cooling_absorption_heat_input_kwh(
            generator_input_kwh=100,
            part_load_value=absorption_part_load,
            nominal_heat_ratio=0.7,
        )
        heat_rejected = 100 * (1 + 1 / (0.95 * 0.7))
        auxiliary_electric = heat_rejected * 0.01 + heat_rejected * 0.002 + 240 * 0.01
        carrier_result = cooling_absorption_multi_carrier_input(
            absorption_heat,
            auxiliary_electric,
            absorption_heat_carrier="natural_gas",
            auxiliary_carrier="electricity",
        )

        self.assertAlmostEqual(absorption_part_load, 0.95, places=12)
        self.assertAlmostEqual(absorption_heat, 100 / (0.95 * 0.7), places=12)
        self.assertAlmostEqual(
            carrier_result["carrier_energy"]["natural_gas"],
            absorption_heat,
            places=12,
        )
        self.assertAlmostEqual(
            carrier_result["carrier_energy"]["electricity"],
            auxiliary_electric,
            places=12,
        )
        self.assertAlmostEqual(
            carrier_result["total_delivered_input_kwh"],
            absorption_heat + auxiliary_electric,
            places=12,
        )

        with self.assertRaises(ValueError):
            cooling_unmet_load_kwh(5, 6)


if __name__ == "__main__":
    unittest.main()
