"""Adapter for the product-facing LaCurent simple building input contract.

The product contract is intentionally smaller than the historical Building DNA
model.  It contains physical building facts and calculation-ready profiles that
have already been sourced or entered; it does not include UI state or JavaScript
runtime internals.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from .schemas import ENGINE_INPUT_SCHEMA_VERSION
from ..core.diagnostics import diagnostic


SIMPLE_INPUT_SCHEMA_VERSION = "lacurent_simple_input_v1"
SUPPORTED_MONTHS = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")


class SimpleContractError(ValueError):
    """Expected missing simple-contract input."""


def _number(value: Any, path: str, *, required: bool = True) -> float | None:
    if value in ("", None):
        if required:
            raise SimpleContractError(f"{path} este obligatoriu.")
        return None
    if isinstance(value, dict):
        value = value.get("amount", value.get("value"))
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise SimpleContractError(f"{path} trebuie sa fie numeric.")
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        raise SimpleContractError(f"{path} trebuie sa fie finit.")
    return number


def _positive(value: Any, path: str, *, required: bool = True) -> float | None:
    number = _number(value, path, required=required)
    if number is None:
        return None
    if number <= 0:
        raise SimpleContractError(f"{path} trebuie sa fie pozitiv.")
    return number


def _q(value: float, unit: str) -> dict[str, Any]:
    return {"amount": float(value), "unit": unit}


def _monthly_profiles(simple_input: dict[str, Any]) -> list[dict[str, Any]]:
    calculation = simple_input.get("calculation", {}) if isinstance(simple_input.get("calculation"), dict) else {}
    profiles = calculation.get("monthlyProfiles")
    if not isinstance(profiles, list) or len(profiles) != 12:
        raise SimpleContractError(
            "calculation.monthlyProfiles trebuie sa contina 12 profiluri lunare sursa. "
            "P12A nu inventeaza clima, castiguri sau programe de utilizare."
        )
    months = [item.get("month") for item in profiles if isinstance(item, dict)]
    if months and any(month not in SUPPORTED_MONTHS for month in months):
        raise SimpleContractError("calculation.monthlyProfiles contine luni nesuportate.")
    return deepcopy(profiles)


def _geometry(simple_input: dict[str, Any]) -> dict[str, float]:
    building = simple_input.get("building", {}) if isinstance(simple_input.get("building"), dict) else {}
    length = _positive(building.get("lengthM"), "building.lengthM")
    width = _positive(building.get("widthM"), "building.widthM")
    levels = _positive(building.get("levels"), "building.levels")
    floor_height = _positive(building.get("floorHeightM"), "building.floorHeightM")
    useful_area = _positive(building.get("usefulAreaM2"), "building.usefulAreaM2", required=False)
    footprint = length * width
    floor_count = int(round(levels))
    if floor_count <= 0:
        raise SimpleContractError("building.levels trebuie sa fie cel putin 1.")
    return {
        "lengthM": length,
        "widthM": width,
        "levels": float(floor_count),
        "floorHeightM": floor_height,
        "footprintM2": footprint,
        "usefulAreaM2": useful_area if useful_area is not None else footprint * floor_count,
        "heatedVolumeM3": footprint * floor_count * floor_height,
    }


def _envelope(simple_input: dict[str, Any], geometry: dict[str, float]) -> dict[str, Any]:
    envelope = simple_input.get("envelope", {}) if isinstance(simple_input.get("envelope"), dict) else {}
    wall_area = _positive(envelope.get("wallAreaM2"), "envelope.wallAreaM2")
    roof_area = _positive(envelope.get("roofAreaM2"), "envelope.roofAreaM2", required=False) or geometry["footprintM2"]
    floor_area = _positive(envelope.get("floorAreaM2"), "envelope.floorAreaM2", required=False) or geometry["footprintM2"]
    window_area = _number(envelope.get("windowAreaM2"), "envelope.windowAreaM2", required=False)
    if window_area is None:
        window_area = 0.0
    if window_area < 0:
        raise SimpleContractError("envelope.windowAreaM2 nu poate fi negativ.")
    if window_area > wall_area:
        raise SimpleContractError("envelope.windowAreaM2 nu poate depasi envelope.wallAreaM2.")

    wall_u = _positive(envelope.get("wallUValueWPerM2K"), "envelope.wallUValueWPerM2K")
    roof_u = _positive(envelope.get("roofUValueWPerM2K"), "envelope.roofUValueWPerM2K")
    floor_u = _positive(envelope.get("floorUValueWPerM2K"), "envelope.floorUValueWPerM2K")
    window_u = _positive(envelope.get("windowUValueWPerM2K"), "envelope.windowUValueWPerM2K", required=False)

    assemblies = [
        {"assemblyId": "wall-simple", "role": "wall", "directUValue": _q(wall_u, "W/m2K")},
        {"assemblyId": "roof-simple", "role": "roof", "directUValue": _q(roof_u, "W/m2K")},
        {"assemblyId": "floor-simple", "role": "floor", "directUValue": _q(floor_u, "W/m2K")},
    ]
    elements = [
        {
            "elementId": "W01",
            "assemblyRole": "wall",
            "area": _q(max(wall_area - window_area, 0.0), "m2"),
            "boundary": {"type": "outside_air"},
        },
        {"elementId": "R01", "assemblyRole": "roof", "area": _q(roof_area, "m2"), "boundary": {"type": "outside_air"}},
        {"elementId": "F01", "assemblyRole": "floor", "area": _q(floor_area, "m2"), "boundary": {"type": "ground"}},
    ]
    if window_area > 0:
        if window_u is None:
            raise SimpleContractError("envelope.windowUValueWPerM2K este obligatoriu cand exista ferestre.")
        assemblies.append({"assemblyId": "window-simple", "role": "window", "directUValue": _q(window_u, "W/m2K")})
        elements.append({
            "elementId": "GL01",
            "assemblyRole": "window",
            "area": _q(window_area, "m2"),
            "boundary": {"type": "outside_air"},
        })
    return {
        "assemblies": assemblies,
        "elements": elements,
        "thermalBridges": [],
        "simpleEnvelopeProvenance": {
            "contract": SIMPLE_INPUT_SCHEMA_VERSION,
            "windowAreaIncluded": window_area > 0,
        },
    }


def _systems(simple_input: dict[str, Any]) -> dict[str, Any]:
    systems = simple_input.get("systems", {}) if isinstance(simple_input.get("systems"), dict) else {}
    if any(
        isinstance(systems.get(key), dict) and systems[key].get("enabled") is True
        for key in ("heating", "domesticHotWater", "cooling", "ventilation")
    ) and systems.get("technicalContractConfirmed") is not True:
        raise SimpleContractError(
            "Sistemele termice active necesita contract tehnic de componente sau confirmare explicita; "
            "interfata simpla nu transforma pierderile necunoscute in zero."
        )
    result: dict[str, Any] = {}
    heating = systems.get("heating", {}) if isinstance(systems.get("heating"), dict) else {}
    dhw = systems.get("domesticHotWater", {}) if isinstance(systems.get("domesticHotWater"), dict) else {}
    shared = heating.get("sameGeneratorAsDhw") is True and dhw.get("enabled") is not False and heating.get("enabled") is not False

    if heating.get("enabled") is True:
        carrier = heating.get("carrier") or "natural_gas"
        generator_ref = "shared-heating-dhw-generator" if shared else None
        result["heating"] = {
            "enabled": True,
            "systems": [{
                "systemId": "heating-simple",
                "enabled": True,
                "energyCarrier": carrier,
                "generatorRef": generator_ref,
                "stages": [
                    {"stageId": "emission", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                    {"stageId": "distribution", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                    {"stageId": "storage", "lossCalculation": {"mode": "no_heating_storage"}, "auxiliaryKWhPerMonth": 0},
                    {"stageId": "generation", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                ],
            }],
        }
    else:
        result["heating"] = {"enabled": False, "systems": []}

    if dhw.get("enabled") is True:
        useful = _number(dhw.get("monthlyUsefulDemandKWh"), "systems.domesticHotWater.monthlyUsefulDemandKWh", required=False)
        result["domesticHotWater"] = {
            "enabled": True,
            "monthlyUsefulDemandKWh": useful,
            "usefulDemandKWhPerMonth": useful,
            "systems": [{
                "systemId": "dhw-simple",
                "enabled": True,
                "energyCarrier": dhw.get("carrier") or heating.get("carrier") or "natural_gas",
                "generatorRef": "shared-heating-dhw-generator" if shared else None,
                "stages": [
                    {"stageId": "distribution", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                    {"stageId": "storage", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                    {"stageId": "generation", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                ],
            }],
        }
    else:
        result["domesticHotWater"] = {"enabled": False, "systems": []}

    if shared:
        allocation = systems.get("sharedGeneratorAllocation")
        if not isinstance(allocation, dict):
            raise SimpleContractError(
                "systems.sharedGeneratorAllocation este obligatoriu pentru generator comun; P12A nu inventeaza repartizarea serviciilor."
            )
        result["sharedComponents"] = {
            "generators": [{
                "componentId": "shared-heating-dhw-generator",
                "enabled": True,
                "generatorType": heating.get("generator") or "declared_generator",
                "energyCarrier": heating.get("carrier") or "natural_gas",
                "auxiliaryCarrier": heating.get("auxiliaryCarrier") or "electricity",
                "controlLossFactor": _positive(heating.get("controlLossFactor"), "systems.heating.controlLossFactor"),
                "operationHours": _positive(heating.get("operationHoursPerMonth"), "systems.heating.operationHoursPerMonth"),
                "lossPowerKW": _number(heating.get("standbyLossPowerKW"), "systems.heating.standbyLossPowerKW", required=False) or 0,
                "auxiliaryPowerKW": _number(heating.get("auxiliaryPowerKW"), "systems.heating.auxiliaryPowerKW", required=False) or 0,
                "recoveredAuxiliaryFraction": 0,
                "auxiliaryRecoverableFractionToHeating": 0,
                "boilerRoomRecoveryFactor": 0,
                "renewableGeneratorHeatKWh": 0,
                "dhwStorageOrDistributionLossKWh": 0,
                "serviceAllocationFractions": allocation,
            }]
        }

    cooling = systems.get("cooling", {}) if isinstance(systems.get("cooling"), dict) else {}
    if cooling.get("enabled") is True:
        result["cooling"] = {
            "enabled": True,
            "systems": [{
                "systemId": "cooling-simple",
                "enabled": True,
                "energyCarrier": "electricity",
                "stages": [
                    {"stageId": "emission", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                    {"stageId": "distribution", "lossKWhPerMonth": 0, "auxiliaryKWhPerMonth": 0},
                    {"stageId": "storage", "lossCalculation": {"mode": "no_cooling_storage"}, "auxiliaryCalculation": {"mode": "no_cooling_storage"}},
                    {
                        "stageId": "generation",
                        "auxiliaryCalculation": {
                            "mode": "cooling_compression_heat_rejection_auxiliary",
                            "generatorInputRequirementMode": "air_water",
                            "auxiliaryHeatFraction": 0,
                            "operationHours": _positive(cooling.get("operationHoursPerMonth"), "systems.cooling.operationHoursPerMonth"),
                            "nominalCoolingPowerKW": _positive(cooling.get("nominalCoolingPowerKW"), "systems.cooling.nominalCoolingPowerKW"),
                            "nominalEer": _positive(cooling.get("eer"), "systems.cooling.eer"),
                            "eerCorrectionFactor": 1,
                            "heatRejectionPartLoadFactor": 1,
                            "freeCoolingFactor": 1,
                            "multipleGeneratorFactor": 1,
                            "heatRejectionAuxiliaryMode": "specific_electric_demand",
                            "heatRejectionSpecificElectricDemandKWPerKW": 0,
                            "heatRejectionElectricPartLoadFactor": 1,
                            "freeCoolingElectricFactor": 1,
                            "heatRejectionDistributionAuxiliaryMode": "specific_electric_demand",
                            "heatRejectionDistributionSpecificElectricDemandKWPerKW": 0,
                            "controlPowerKW": 0,
                            "allowCapacityLimitedGeneratorInput": True,
                            "unmetLoadPolicy": "report_unmet_load",
                        },
                    },
                ],
            }],
        }
    else:
        result["cooling"] = {"enabled": False, "systems": []}

    ventilation = systems.get("ventilation", {}) if isinstance(systems.get("ventilation"), dict) else {}
    result["ventilationAhu"] = {
        "enabled": bool(ventilation.get("enabled")),
        "systems": [],
    }
    return result


def _renewables(simple_input: dict[str, Any]) -> dict[str, Any]:
    renewables = simple_input.get("renewables", {}) if isinstance(simple_input.get("renewables"), dict) else {}
    pv = renewables.get("photovoltaic", {}) if isinstance(renewables.get("photovoltaic"), dict) else {}
    if pv.get("enabled") is not True:
        return {"photovoltaic": {"enabled": False}}
    result = {"enabled": True}
    if pv.get("annualProductionKWh") not in ("", None):
        result["annualProductionKWh"] = _number(pv.get("annualProductionKWh"), "renewables.photovoltaic.annualProductionKWh")
    elif pv.get("installedPowerKWp") not in ("", None):
        result["installedPowerKWp"] = _positive(pv.get("installedPowerKWp"), "renewables.photovoltaic.installedPowerKWp")
        yields = pv.get("monthlySpecificYieldKWhPerKWp")
        if not isinstance(yields, list) or len(yields) != 12:
            raise SimpleContractError(
                "renewables.photovoltaic.monthlySpecificYieldKWhPerKWp este obligatoriu pentru calculul din putere instalata."
            )
        result["monthlySpecificYieldKWhPerKWp"] = deepcopy(yields)
    else:
        raise SimpleContractError("PV activ necesita productie anuala sau putere instalata cu randamente lunare.")
    return {"photovoltaic": result}


def build_engine_input_from_simple_contract(simple_input: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(simple_input, dict) or simple_input.get("schemaVersion") != SIMPLE_INPUT_SCHEMA_VERSION:
        raise SimpleContractError(f"schemaVersion trebuie sa fie {SIMPLE_INPUT_SCHEMA_VERSION}.")
    geometry = _geometry(simple_input)
    return {
        "schemaVersion": ENGINE_INPUT_SCHEMA_VERSION,
        "building": {
            "buildingId": (simple_input.get("project") or {}).get("projectId") or "lacurent-simple-project",
            "name": (simple_input.get("project") or {}).get("name"),
            "type": (simple_input.get("building") or {}).get("type") or "residential",
            "geometry": geometry,
            "sourceContract": SIMPLE_INPUT_SCHEMA_VERSION,
        },
        "climate": {
            "locality": (simple_input.get("location") or {}).get("locality"),
            "station": (simple_input.get("location") or {}).get("station"),
            "solarGainPreprocessingStatus": (simple_input.get("calculation") or {}).get("solarGainPreprocessingStatus", "available_or_explicit"),
            "monthly": deepcopy((simple_input.get("calculation") or {}).get("climateMonthly", [])),
        },
        "envelope": _envelope(simple_input, geometry),
        "use": {
            "category": (simple_input.get("use") or {}).get("category"),
            "monthlyProfiles": _monthly_profiles(simple_input),
        },
        "systems": _systems(simple_input),
        "renewables": _renewables(simple_input),
        "calculationOptions": {
            "inputDialect": "building_dna_v1",
            "supportedScopes": ["chapter2_supported", "chapter3_non_lighting_supported", "chapter4_pv_supported"],
            "preserveSolarBlocker": True,
            "sourceInputDialect": SIMPLE_INPUT_SCHEMA_VERSION,
        },
    }


def simple_contract_diagnostic(error: Exception) -> dict[str, Any]:
    return diagnostic(
        "SIMPLE_INPUT_CONTRACT_INCOMPLETE",
        str(error),
        path="simpleInput",
        accepted_provenance=("USER_FACT", "PRODUCT_DATA", "NORMATIVE", "DERIVED"),
    )
