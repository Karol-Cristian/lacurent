from __future__ import annotations

import copy
import unittest

from common import REPO_ROOT, close, load_json
from lacurent_engine import calculate
from lacurent_engine.api.execution_domain import EXECUTION_DOMAIN_MANIFEST


def q(value: float, unit: str) -> dict:
    return {"amount": value, "unit": unit}


def monthly_profile(month: str = "jan") -> dict:
    return {
        "month": month,
        "transmission": {
            "heating": {
                "duration": q(720, "h"),
                "indoorTemperature": q(20, "degC"),
                "outdoorTemperature": q(0, "degC"),
            },
            "cooling": {
                "duration": q(720, "h"),
                "indoorTemperature": q(26, "degC"),
                "outdoorTemperature": q(30, "degC"),
            },
        },
        "ventilation": {
            "heating": {
                "airHeatCapacity": q(1200, "J/m3K"),
                "airFlowRate": q(1 / 60, "m3/s"),
            }
        },
        "heatGains": {
            "internalGains": q(250, "kWh"),
            "solarGains": q(150, "kWh"),
        },
        "utilization": {
            "effectiveInternalHeatCapacity": q(100_000_000, "J/K"),
            "heating": {"aH0": q(1, "dimensionless"), "tauH0": q(15, "h")},
            "cooling": {"aC0": q(1, "dimensionless"), "tauC0": q(15, "h"), "aCred": q(1, "dimensionless")},
        },
    }


def stage(stage_id: str, loss: float = 0, auxiliary: float = 0, **extra: object) -> dict:
    return {
        "stageId": stage_id,
        "lossKWhPerMonth": loss,
        "auxiliaryKWhPerMonth": auxiliary,
        **extra,
    }


def base_input() -> dict:
    return {
        "schemaVersion": "lacurent_engine_input_v1",
        "building": {"buildingId": "p11b-direct-house", "type": "detached_house"},
        "climate": {"solarGainPreprocessingStatus": "available_or_explicit", "monthly": []},
        "envelope": {
            "assemblies": [
                {"assemblyId": "wall-direct", "role": "wall", "directUValue": q(1.0, "W/m2K")},
            ],
            "elements": [
                {"elementId": "W01", "assemblyRole": "wall", "area": q(100, "m2"), "boundary": {"type": "outside_air"}},
            ],
            "thermalBridges": [],
        },
        "use": {"monthlyProfiles": [monthly_profile(month) for month in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]]},
        "systems": {},
        "renewables": {},
        "calculationOptions": {"inputDialect": "building_dna_v1", "preserveSolarBlocker": True},
    }


class BuildingDnaDirectExecutionTests(unittest.TestCase):
    def test_direct_chapter2_executes_from_building_dna_contract(self):
        result = calculate(base_input())

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["chapter2"]["status"], "calculated")
        close(result["chapter2"]["annual"]["qHndKWh"], 15936.000000133218, 1e-7)
        close(result["chapter2"]["annual"]["qCndKWh"], 708.1927276716915, 1e-7)
        self.assertGreaterEqual(len(result["chapter2"]["executionTrace"]), 2)

    def test_source_backed_solar_blocker_is_preserved(self):
        engine_input = base_input()
        engine_input["climate"]["solarGainPreprocessingStatus"] = "blocked_qsky"
        for profile in engine_input["use"]["monthlyProfiles"]:
            profile["heatGains"]["solarGainsSource"] = "provider_climate_profile_without_qsol_preprocessing"

        result = calculate(engine_input)

        self.assertEqual(result["status"], "incomplete")
        self.assertEqual(result["chapter2"]["status"], "incomplete")
        self.assertTrue(any(item["code"] == "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED" for item in result["diagnostics"]))

    def test_higher_heat_transfer_does_not_reduce_heating_need(self):
        baseline = calculate(base_input())
        leakier = base_input()
        leakier["envelope"]["assemblies"][0]["directUValue"] = q(1.4, "W/m2K")

        leakier_result = calculate(leakier)

        self.assertGreater(leakier_result["chapter2"]["annual"]["qHndKWh"], baseline["chapter2"]["annual"]["qHndKWh"])

    def test_shared_heating_dhw_generator_is_calculated_once(self):
        engine_input = base_input()
        engine_input["systems"] = {
            "heating": {
                "enabled": True,
                "systems": [
                    {
                        "systemId": "heating-1",
                        "enabled": True,
                        "generatorRef": "shared-boiler-1",
                        "stages": [
                            stage("emission"),
                            stage("distribution"),
                            stage("storage"),
                            stage("generation"),
                        ],
                    }
                ],
            },
            "domesticHotWater": {
                "enabled": True,
                "usefulDemandKWhPerMonth": 60,
                "systems": [
                    {
                        "systemId": "dhw-1",
                        "enabled": True,
                        "generatorRef": "shared-boiler-1",
                        "stages": [
                            stage("distribution"),
                            stage("storage"),
                            stage("generation"),
                        ],
                    }
                ],
            },
            "sharedComponents": {
                "generators": [
                    {
                        "componentId": "shared-boiler-1",
                        "enabled": True,
                        "generatorType": "condensing_boiler",
                        "energyCarrier": "natural_gas",
                        "auxiliaryCarrier": "electricity",
                        "controlLossFactor": 1.05,
                        "operationHours": 100,
                        "lossPowerKW": 0.2,
                        "auxiliaryPowerKW": 0.05,
                        "recoveredAuxiliaryFraction": 0.2,
                        "auxiliaryRecoverableFractionToHeating": 0.5,
                        "boilerRoomRecoveryFactor": 0.1,
                        "renewableGeneratorHeatKWh": 0,
                        "dhwStorageOrDistributionLossKWh": 0,
                        "serviceAllocationFractions": {"heating": 0.7, "dhw": 0.3},
                    }
                ]
            },
        }

        result = calculate(engine_input)

        self.assertEqual(result["status"], "ready")
        annual = result["chapter3"]["annual"]
        close(annual["sharedGeneratorFuelInputKWh"], 17680.80000013988, 1e-7)
        close(annual["sharedGeneratorAuxiliaryKWh"], 60, 1e-12)
        close(result["energyCarriers"]["natural_gas"], 17680.80000013988, 1e-7)
        close(result["energyCarriers"]["electricity"], 60, 1e-12)
        close(annual["heatingInputKWh"] + annual["dhwInputKWh"], 17740.80000013988, 1e-7)
        shared = result["chapter3"]["monthly"][0]["sharedGenerators"][0]
        close(shared["invariants"]["serviceFuelAllocationKWh"], shared["physicalTotals"]["fuelInputKWh"], 1e-9)
        close(shared["invariants"]["serviceAuxiliaryAllocationKWh"], shared["physicalTotals"]["auxiliaryKWh"], 1e-9)

    def test_multi_service_shared_generator_requires_explicit_service_allocation(self):
        engine_input = base_input()
        engine_input["systems"] = {
            "heating": {
                "enabled": True,
                "systems": [{
                    "systemId": "heating-1",
                    "enabled": True,
                    "generatorRef": "shared-boiler-1",
                    "stages": [stage("emission"), stage("distribution"), stage("storage"), stage("generation")],
                }],
            },
            "domesticHotWater": {
                "enabled": True,
                "usefulDemandKWhPerMonth": 60,
                "systems": [{
                    "systemId": "dhw-1",
                    "enabled": True,
                    "generatorRef": "shared-boiler-1",
                    "stages": [stage("distribution"), stage("storage"), stage("generation")],
                }],
            },
            "sharedComponents": {
                "generators": [{
                    "componentId": "shared-boiler-1",
                    "enabled": True,
                    "controlLossFactor": 1.05,
                    "operationHours": 100,
                    "lossPowerKW": 0.2,
                    "auxiliaryPowerKW": 0.05,
                    "recoveredAuxiliaryFraction": 0.2,
                    "auxiliaryRecoverableFractionToHeating": 0.5,
                    "boilerRoomRecoveryFactor": 0.1,
                    "renewableGeneratorHeatKWh": 0,
                    "dhwStorageOrDistributionLossKWh": 0,
                }]
            },
        }

        result = calculate(engine_input)

        self.assertEqual(result["status"], "blocked")
        self.assertTrue(any("serviceAllocationFractions" in item["message"] for item in result["diagnostics"]))

    def test_missing_stage_value_blocks_instead_of_becoming_zero(self):
        engine_input = base_input()
        engine_input["systems"] = {
            "heating": {
                "enabled": True,
                "systems": [
                    {
                        "systemId": "heating-1",
                        "enabled": True,
                        "stages": [
                            {"stageId": "emission", "auxiliaryKWhPerMonth": 0},
                            stage("distribution"),
                            stage("storage"),
                            stage("generation"),
                        ],
                    }
                ],
            }
        }

        result = calculate(engine_input)

        self.assertEqual(result["status"], "blocked")
        self.assertTrue(any(item["code"] == "MISSING_ENGINE_INPUT" for item in result["diagnostics"]))

    def test_pv_annual_product_contract_is_supported(self):
        engine_input = base_input()
        engine_input["renewables"] = {"photovoltaic": {"enabled": True, "annualProductionKWh": 4200}}

        result = calculate(engine_input)

        self.assertEqual(result["chapter4"]["status"], "calculated")
        self.assertEqual(result["chapter4"]["annualProductionKWh"], 4200)

    def test_larger_pv_contract_value_increases_pv_production(self):
        smaller = base_input()
        smaller["renewables"] = {"photovoltaic": {"enabled": True, "annualProductionKWh": 2400}}
        larger = base_input()
        larger["renewables"] = {"photovoltaic": {"enabled": True, "annualProductionKWh": 4800}}

        smaller_result = calculate(smaller)
        larger_result = calculate(larger)

        self.assertGreater(larger_result["chapter4"]["annualProductionKWh"], smaller_result["chapter4"]["annualProductionKWh"])

    def test_batch_cli_contract_accepts_multiple_building_dna_inputs(self):
        first = base_input()
        second = copy.deepcopy(first)
        second["building"]["buildingId"] = "p11b-direct-house-2"

        self.assertEqual(first["calculationOptions"]["inputDialect"], "building_dna_v1")
        self.assertEqual(second["calculationOptions"]["inputDialect"], "building_dna_v1")

    def test_execution_domain_manifest_matches_reference_json(self):
        reference = load_json(REPO_ROOT / "validation-reference" / "python-engine-execution-domain.json")
        self.assertEqual(reference, EXECUTION_DOMAIN_MANIFEST)


if __name__ == "__main__":
    unittest.main()
