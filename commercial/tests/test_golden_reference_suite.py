from __future__ import annotations

import ast
from copy import deepcopy
from pathlib import Path

import pytest

from commercial.app.engine import calculate
from commercial.app.models import BuildingInput
from commercial.validation import golden_reference as golden


MANIFEST = golden.load_manifest()
CASES = MANIFEST["cases"]


def _building_for_case(case: dict) -> BuildingInput:
    profile = deepcopy(MANIFEST["building_profiles"][case["building_profile"]])
    system = deepcopy(MANIFEST["system_profiles"][case["system_profile"]])

    dhw = system["dhw"]
    dhw["occupants"] = profile["occupants"]
    dhw["litres_per_person_day_at_60c"] = golden.DHW_LITRES_PER_PERSON_DAY_AT_60C

    return BuildingInput(
        project_name=f"Golden {case['id']}",
        locality=case["climate_station"],
        building_type=profile["building_type"],
        construction_year=profile["construction_year"],
        heated_floor_area_m2=profile["heated_floor_area_m2"],
        heated_volume_m3=profile["heated_volume_m3"],
        indoor_design_temperature_c=profile["indoor_design_temperature_c"],
        internal_gains_w_m2=profile["internal_gains_w_m2"],
        solar_gains_kwh_m2_month=profile["solar_gains_kwh_m2_month"],
        solar={"mode": "explicit"},
        envelope=profile["envelope"],
        thermal_bridges=profile["thermal_bridges"],
        ventilation=profile["ventilation"],
        heating=system["heating"],
        cooling=system["cooling"],
        dhw=dhw,
    )


def _assert_within(metric: str, actual: float, expected: float) -> None:
    tolerance = MANIFEST["tolerances"][metric]
    allowed = max(
        float(tolerance["absolute"]),
        abs(float(expected)) * float(tolerance["relative"]),
    )
    delta = abs(float(actual) - float(expected))
    assert delta <= allowed, (
        f"{metric}: actual={actual:.9f}, expected={expected:.9f}, "
        f"delta={delta:.9f}, allowed={allowed:.9f}"
    )


def test_golden_reference_matrix_has_required_release_coverage() -> None:
    assert len(CASES) == 20
    assert len({case["id"] for case in CASES}) == 20
    assert len({case["climate_station"] for case in CASES}) >= 5

    represented_types = {
        MANIFEST["building_profiles"][case["building_profile"]]["building_type"]
        for case in CASES
    }
    assert represented_types == {"residential_individual", "residential_collective"}

    represented_systems = {case["system_profile"] for case in CASES}
    assert represented_systems == {
        "condensing_gas",
        "heat_pump",
        "direct_electric",
        "district_heat",
    }

    references = [golden.calculate_reference(case, MANIFEST) for case in CASES]
    assert any(item["annual_cooling_demand_kwh"] > 0 for item in references)
    assert len({item["energy_class"] for item in references}) >= 2


def test_golden_reference_oracle_does_not_import_production_calculation_code() -> None:
    source = Path(golden.__file__).read_text(encoding="utf-8")
    tree = ast.parse(source)
    imported_modules = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported_modules.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported_modules.append(node.module)
    assert not any(
        module == "commercial.app" or module.startswith("commercial.app.")
        for module in imported_modules
    )


@pytest.mark.parametrize("case", CASES, ids=[case["id"] for case in CASES])
def test_commercial_engine_matches_independent_golden_reference(case: dict) -> None:
    reference = golden.calculate_reference(case, MANIFEST)
    result = calculate(_building_for_case(case), include_reference=False)

    _assert_within(
        "annual_heating_demand_kwh",
        result.annual_heating_demand_kwh,
        reference["annual_heating_demand_kwh"],
    )
    _assert_within(
        "annual_cooling_demand_kwh",
        result.annual_cooling_demand_kwh,
        reference["annual_cooling_demand_kwh"],
    )
    _assert_within(
        "primary_energy_total_kwh",
        result.primary_energy.total_kwh,
        reference["primary_energy_total_kwh"],
    )
    _assert_within(
        "primary_energy_specific_kwh_m2",
        result.primary_energy.specific_kwh_m2,
        reference["primary_energy_specific_kwh_m2"],
    )
    _assert_within(
        "co2_total_kg",
        result.co2.total_kg,
        reference["co2_total_kg"],
    )
    _assert_within(
        "co2_specific_kg_m2",
        result.co2.specific_kg_m2,
        reference["co2_specific_kg_m2"],
    )
    assert result.energy_class == reference["energy_class"]
