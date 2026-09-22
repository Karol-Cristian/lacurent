from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, Field

from .engine import calculate
from .methodology import methodology, resolve_climate, resolve_monthly_plane_hsol
from .models import BuildingInput, HeatingEmitterType, HeatingDistributionType


SCHEMA_VERSION = "1.0"
PV_ORIENTATIONS = (
    "south",
    "south_west",
    "west",
    "north_west",
    "north",
    "north_east",
    "east",
    "south_east",
)



class EnvelopeUpgradeRequirementV1(BaseModel):
    surface: Literal["exterior_wall", "roof", "floor"]
    category: Literal["facade_insulation", "roof_insulation", "floor_insulation"]
    affected_area_m2: float
    current_u_w_m2k: float
    target_u_w_m2k: float
    required_added_r_m2k_w: float
    target_already_met: bool
    methodology_source: str


class PvPlaneCandidateV1(BaseModel):
    orientation: str
    tilt_degrees: float
    annual_plane_hsol_kwh_m2: float
    relative_to_optimum_percent: float | None = None


class PvPlaneOptimizationV1(BaseModel):
    methodology: str
    climate_station: str | None = None
    source_model: str
    optimum: PvPlaneCandidateV1
    current: PvPlaneCandidateV1
    current_loss_vs_optimum_percent: float
    evaluated_orientations: int
    evaluated_tilts: int
    assumptions: list[str] = Field(default_factory=list)


class HeatingDesignRequirementV1(BaseModel):
    design_outdoor_temperature_c: float
    design_indoor_temperature_c: float
    heat_loss_coefficient_w_k: float
    design_heat_load_kw: float
    minimum_generator_capacity_kw: float
    hydronic: bool
    emitter_type: str
    distribution_type: str
    design_flow_temperature_c: float | None = None
    design_return_temperature_c: float | None = None
    water_delta_t_k: float | None = None
    required_water_flow_l_h: float | None = None
    minimum_pipe_inner_diameter_mm: float | None = None
    pipe_length_status: Literal["requires_distribution_layout", "not_applicable"]
    methodology: str
    assumptions: list[str] = Field(default_factory=list)


class EngineeringRequirementsResponseV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    envelope: list[EnvelopeUpgradeRequirementV1]
    photovoltaic: PvPlaneOptimizationV1
    heating: HeatingDesignRequirementV1


class EngineeringRequirementsRequestV1(BaseModel):
    baseline: BuildingInput


def _round(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def _annual_plane_hsol(building: BuildingInput, orientation: str, tilt: float) -> tuple[float, dict]:
    climate = resolve_climate(building.locality)
    plane = resolve_monthly_plane_hsol(climate, orientation, tilt)
    if plane is None:
        raise ValueError(
            f"No source-backed solar plane data are available for orientation={orientation}, tilt={tilt}."
        )
    return sum(float(value) for value in plane["values_kwh_m2_month"]), plane


def optimize_pv_plane(building: BuildingInput) -> PvPlaneOptimizationV1:
    climate = resolve_climate(building.locality)
    sizing_cfg = methodology()["engineering_sizing"]["photovoltaic_plane_search"]
    tilt_grid = tuple(
        range(
            int(sizing_cfg["tilt_min_degrees"]),
            int(sizing_cfg["tilt_max_degrees"]) + 1,
            int(sizing_cfg["tilt_step_degrees"]),
        )
    )
    candidates: list[tuple[float, str, float, dict]] = []
    for orientation in PV_ORIENTATIONS:
        for tilt in tilt_grid:
            plane = resolve_monthly_plane_hsol(climate, orientation, float(tilt))
            if plane is None:
                continue
            annual = sum(float(value) for value in plane["values_kwh_m2_month"])
            candidates.append((annual, orientation, float(tilt), plane))

    if not candidates:
        raise ValueError("No source-backed solar plane data are available for PV optimization.")

    candidates.sort(key=lambda row: (-row[0], row[2], row[1]))
    best_annual, best_orientation, best_tilt, best_plane = candidates[0]

    current_pv = building.renewables.pv
    current_orientation = current_pv.orientation
    current_tilt = float(current_pv.tilt_degrees)
    current_annual, current_plane = _annual_plane_hsol(
        building,
        current_orientation,
        current_tilt,
    )

    ratio = 100.0 * current_annual / best_annual if best_annual > 0 else 0.0
    return PvPlaneOptimizationV1(
        methodology="LaCurent Light source-backed monthly solar-plane optimization",
        climate_station=climate.get("station"),
        source_model=str(best_plane.get("plane_model") or "unknown"),
        optimum=PvPlaneCandidateV1(
            orientation=best_orientation,
            tilt_degrees=_round(best_tilt, 1),
            annual_plane_hsol_kwh_m2=_round(best_annual, 1),
            relative_to_optimum_percent=100.0,
        ),
        current=PvPlaneCandidateV1(
            orientation=current_orientation,
            tilt_degrees=_round(current_tilt, 1),
            annual_plane_hsol_kwh_m2=_round(current_annual, 1),
            relative_to_optimum_percent=_round(ratio, 2),
        ),
        current_loss_vs_optimum_percent=_round(max(100.0 - ratio, 0.0), 2),
        evaluated_orientations=len(PV_ORIENTATIONS),
        evaluated_tilts=len(tilt_grid),
        assumptions=[
            "Optimization maximizes annual plane irradiation, independently of any commercial PV module.",
            "The Light Engine uses source-backed monthly Hsol data and its documented horizontal-to-vertical plane interpolation.",
            "No product efficiency, manufacturer yield claim or catalog performance factor is used to choose orientation or tilt.",
        ],
    )


def envelope_upgrade_requirements(building: BuildingInput) -> list[EnvelopeUpgradeRequirementV1]:
    result = calculate(building, include_reference=False)
    targets = methodology()["nzeb"]["residential_envelope_u_max_w_m2k"]
    source = methodology()["nzeb"]["envelope_source"]

    rows = [
        (
            "exterior_wall",
            "facade_insulation",
            result.envelope_geometry.net_wall_area_m2,
            result.envelope_u_values.wall_u_value_w_m2k,
            targets["exterior_wall"],
        ),
        (
            "roof",
            "roof_insulation",
            result.envelope_geometry.roof_area_m2,
            result.envelope_u_values.roof_u_value_w_m2k,
            targets["roof"],
        ),
        (
            "floor",
            "floor_insulation",
            result.envelope_geometry.floor_area_m2,
            result.envelope_u_values.floor_u_value_w_m2k,
            targets["floor_generic_conservative"],
        ),
    ]

    requirements: list[EnvelopeUpgradeRequirementV1] = []
    for surface, category, area, current_u, target_u in rows:
        if current_u is None or float(area) <= 0:
            continue
        current_u_f = float(current_u)
        target_u_f = float(target_u)
        required_r = max((1.0 / target_u_f) - (1.0 / current_u_f), 0.0)
        requirements.append(
            EnvelopeUpgradeRequirementV1(
                surface=surface,
                category=category,
                affected_area_m2=_round(area, 2),
                current_u_w_m2k=_round(current_u_f, 4),
                target_u_w_m2k=_round(target_u_f, 4),
                required_added_r_m2k_w=_round(required_r, 4),
                target_already_met=required_r <= 1e-9,
                methodology_source=source,
            )
        )
    return requirements


def heating_design_requirement(building: BuildingInput) -> HeatingDesignRequirementV1:
    result = calculate(building, include_reference=False)
    climate = result.climate
    outdoor = climate.get("winter_design_temperature_c")
    if outdoor is None:
        raise ValueError("Winter design temperature is missing for the selected climate profile.")

    indoor = float(building.indoor_design_temperature_c)
    delta_t_air = max(indoor - float(outdoor), 0.0)
    design_load_kw = float(result.heat_loss_w_k) * delta_t_air / 1000.0

    details = building.heating.details
    emitter = (
        details.emitter_type
        if details is not None
        else HeatingEmitterType.radiators_high_temp
    )
    distribution = (
        details.distribution_type
        if details is not None
        else HeatingDistributionType.hydronic_insulated
    )
    hydronic = distribution in {
        HeatingDistributionType.hydronic_insulated,
        HeatingDistributionType.hydronic_uninsulated,
        HeatingDistributionType.underfloor,
    }

    flow_c = None
    return_c = None
    water_delta_t = None
    required_flow_l_h = None
    min_inner_d_mm = None
    assumptions = [
        "Generator capacity requirement is the calculated building design heat load; no hidden commercial oversizing margin is added.",
    ]

    if hydronic:
        registry = methodology()["heating_system_chain_light"]["emitters"][emitter.value]
        flow_c = (
            float(details.design_flow_temperature_c)
            if details is not None and details.design_flow_temperature_c is not None
            else float(registry["flow_c"])
        )
        return_c = (
            float(details.design_return_temperature_c)
            if details is not None and details.design_return_temperature_c is not None
            else float(registry["return_c"])
        )
        water_delta_t = max(flow_c - return_c, 1.0)

        hydronic_cfg = methodology()["engineering_sizing"]["hydronic"]
        water_cp_j_kgk = float(hydronic_cfg["water_specific_heat_j_kgk"])
        water_density_kg_m3 = float(hydronic_cfg["water_density_kg_m3"])
        maximum_design_velocity_m_s = float(hydronic_cfg["maximum_design_velocity_m_s"])

        mass_flow_kg_s = (design_load_kw * 1000.0) / (water_cp_j_kgk * water_delta_t)
        volume_flow_m3_s = mass_flow_kg_s / water_density_kg_m3
        required_flow_l_h = volume_flow_m3_s * 3_600_000.0
        min_inner_d_m = math.sqrt(
            (4.0 * volume_flow_m3_s) / (math.pi * maximum_design_velocity_m_s)
        )
        min_inner_d_mm = min_inner_d_m * 1000.0
        assumptions.extend(
            [
                "Hydronic design flow follows Q = m_dot * cp * DeltaT using water cp=4180 J/(kg*K) and density=997 kg/m3.",
                "Minimum internal diameter is derived from a transparent Light sizing ceiling of 0.8 m/s water velocity.",
                "Pipe length is intentionally not estimated without a distribution layout or explicit route lengths.",
            ]
        )

    return HeatingDesignRequirementV1(
        design_outdoor_temperature_c=_round(outdoor, 1),
        design_indoor_temperature_c=_round(indoor, 1),
        heat_loss_coefficient_w_k=_round(result.heat_loss_w_k, 2),
        design_heat_load_kw=_round(design_load_kw, 3),
        minimum_generator_capacity_kw=_round(design_load_kw, 3),
        hydronic=hydronic,
        emitter_type=emitter.value,
        distribution_type=distribution.value,
        design_flow_temperature_c=None if flow_c is None else _round(flow_c, 1),
        design_return_temperature_c=None if return_c is None else _round(return_c, 1),
        water_delta_t_k=None if water_delta_t is None else _round(water_delta_t, 1),
        required_water_flow_l_h=None if required_flow_l_h is None else _round(required_flow_l_h, 1),
        minimum_pipe_inner_diameter_mm=None if min_inner_d_mm is None else _round(min_inner_d_mm, 2),
        pipe_length_status="requires_distribution_layout" if hydronic else "not_applicable",
        methodology="MC001 heat-loss coefficient + transparent first-principles hydronic sizing",
        assumptions=assumptions,
    )


def build_engineering_requirements(building: BuildingInput) -> EngineeringRequirementsResponseV1:
    return EngineeringRequirementsResponseV1(
        envelope=envelope_upgrade_requirements(building),
        photovoltaic=optimize_pv_plane(building),
        heating=heating_design_requirement(building),
    )
