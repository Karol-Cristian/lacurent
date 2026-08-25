from __future__ import annotations

import unittest

from lacurent_engine.chapter3.cooling import (
    cooling_compression_delivered_electric_input_kwh,
    cooling_compression_electric_input_kwh,
    cooling_generator_input_by_capacity_limit,
    cooling_part_load_bin,
    cooling_part_load_factor,
)
from lacurent_engine.chapter3.shared_generation import calculate_shared_generator_case


class Chapter3PythonEngineTests(unittest.TestCase):
    def test_shared_generator_physical_energy_is_allocated_not_duplicated(self):
        result = calculate_shared_generator_case({
            "componentId": "shared-boiler-p11",
            "serviceLoadsKWh": {"heating": 103, "dhw": 53},
            "controlLossFactor": 1.05,
            "operationHours": 100,
            "lossPowerKW": 0.2,
            "auxiliaryPowerKW": 0.05,
            "recoveredAuxiliaryFraction": 0.2,
            "boilerRoomRecoveryFactor": 0.1,
            "auxiliaryRecoverableFractionToHeating": 0.5,
            "lossRecoverableFractionToHeating": 0.3,
            "serviceAllocationFractions": {"heating": 0.65, "dhw": 0.35},
            "energyCarrier": "natural_gas",
            "auxiliaryCarrier": "electricity",
        })

        self.assertEqual(result["status"], "calculated")
        self.assertAlmostEqual(
            result["invariants"]["serviceFuelAllocationKWh"],
            result["invariants"]["physicalFuelInputKWh"],
            places=9,
        )
        self.assertAlmostEqual(
            result["invariants"]["serviceAuxiliaryAllocationKWh"],
            result["invariants"]["physicalAuxiliaryKWh"],
            places=9,
        )
        self.assertEqual(set(result["serviceAllocations"]), {"heating", "dhw"})

    def test_cooling_eer_sensitivity_is_monotonic(self):
        generator_required = 166.25
        operation_hours = 240
        nominal_power_kw = 20
        load = cooling_part_load_factor(generator_required, operation_hours, nominal_power_kw)
        part_load = cooling_part_load_bin(load)
        generator_input = cooling_generator_input_by_capacity_limit(generator_required, operation_hours, nominal_power_kw)
        delivered = []
        for eer in [2, 3, 4, 5]:
            compression = cooling_compression_electric_input_kwh(generator_input, part_load, eer, 1)
            delivered.append(cooling_compression_delivered_electric_input_kwh(compression, 0))

        self.assertTrue(all(later < earlier for earlier, later in zip(delivered, delivered[1:])), delivered)


if __name__ == "__main__":
    unittest.main()
