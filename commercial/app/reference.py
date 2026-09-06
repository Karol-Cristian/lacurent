from __future__ import annotations

from copy import deepcopy

from .methodology import methodology
from .models import BuildingInput, CoolingInput, DhwInput, HeatingInput, HeatingSystemType


def build_reference_input(actual: BuildingInput) -> BuildingInput:
    """Create the reference building by changing parameters, not the engine."""

    data = actual.model_dump()
    rules = methodology()["reference_building"]
    u_values = rules["u_values_w_m2k"]

    for element in data["envelope"]:
        reference_u = u_values.get(element["type"])
        if reference_u is not None:
            element["u_value_w_m2k"] = reference_u

    data["thermal_bridges"] = []
    data["ventilation"] = {
        "air_changes_per_hour": rules["air_changes_per_hour"],
        "heat_recovery_efficiency": rules["heat_recovery_efficiency"],
    }
    data["heating"] = HeatingInput(
        system_type=HeatingSystemType.condensing_gas_boiler,
        efficiency=rules["heating_efficiency"],
    ).model_dump()
    data["cooling"] = CoolingInput(
        enabled=actual.cooling.enabled,
        seer=rules["cooling_seer"] if actual.cooling.enabled else None,
        setpoint_c=actual.cooling.setpoint_c,
    ).model_dump()
    data["dhw"] = DhwInput(
        enabled=actual.dhw.enabled,
        occupants=actual.dhw.occupants,
        litres_per_person_day_at_60c=actual.dhw.litres_per_person_day_at_60c,
        efficiency=rules["dhw_efficiency"],
    ).model_dump()

    return BuildingInput(**deepcopy(data))
