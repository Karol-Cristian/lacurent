from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from .engine import calculate
from .methodology import methodology, resolve_climate
from .models import (
    BuildingInput,
    Carrier,
    HeatingDistributionType,
    HeatingEmitterType,
    HeatingGeneratorType,
    HeatingInput,
    HeatingSystemDetails,
    HeatingSystemType,
    model_to_dict,
)
from .optimization import (
    CandidateEvaluationV1,
    CostLineV1,
    cached_baseline_evaluation,
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    OptimizationSearchRequestV1,
    OptimizationSelectionV1,
    run_parametric_optimization,
    select_optimization_candidate,
)
from .pricing import estimate_energy_cost


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "heating-technology-planning.seed.json"
HYDRONIC_EMITTERS = {
    "radiators_high_temp",
    "radiators_low_temp",
    "underfloor",
    "fan_coils",
}
HYDRONIC_DISTRIBUTIONS = {
    "hydronic_insulated",
    "hydronic_uninsulated",
    "underfloor",
}

# Technical branches exist independently from the commercial SKU catalog.
# These two are intentionally technical-only until source-backed installed-cost
# curves and real product families are attached. They must still be simulated
# so the user can compare physics without pretending a market price exists.
SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES: dict[str, dict[str, Any]] = {
    "heat-pump-air-air": {
        "label": "Pompă de căldură aer-aer",
        "system_type": HeatingSystemType.heat_pump,
        "generator_type": HeatingGeneratorType.heat_pump_air_air,
        "carrier": Carrier.electricity,
        "cost_profile": "electricity",
        "requires_hydronic": False,
        "economic_eligible": False,
        "note": (
            "Ramură tehnică calculată parametric. Catalogul comercial/costul instalat "
            "pentru aer-aer nu este încă source-backed, deci nu poate câștiga selecția "
            "economică până la atașarea costului."
        ),
    },
    "heat-pump-ground-water": {
        "label": "Pompă de căldură sol-apă",
        "system_type": HeatingSystemType.heat_pump,
        "generator_type": HeatingGeneratorType.heat_pump_ground_water,
        "carrier": Carrier.electricity,
        "cost_profile": "electricity",
        "requires_hydronic": True,
        "economic_eligible": False,
        "note": (
            "Ramură tehnică calculată parametric. Captarea geotermală și costul instalat "
            "depind de teren/foraj și nu sunt încă source-backed în catalog; ramura nu "
            "poate câștiga selecția economică până la completarea datelor."
        ),
    },
}


class HeatPumpPerformancePointV1(BaseModel):
    product_id: str
    outdoor_temperature_c: float
    flow_temperature_c: float
    return_temperature_c: float | None = None
    delta_t_k: float | None = None
    heating_capacity_kw: float | None = Field(default=None, gt=0)
    cop: float = Field(gt=1)
    test_standard: str | None = None
    source_kind: str
    source_url: str | None = None
    note: str = ""


class HeatPumpSeasonalPerformanceV1(BaseModel):
    product_id: str
    climate: str
    application_temperature_c: float
    scop: float = Field(gt=1)
    design_load_kw: float | None = Field(default=None, gt=0)
    source_kind: str
    source_url: str | None = None
    test_standard: str | None = None


class HeatingPlanningOptionV1(BaseModel):
    technology_id: str
    technology_label: str
    id: str
    external_id: str | None = None
    label: str
    system_type: HeatingSystemType
    generator_type: HeatingGeneratorType
    carrier: Carrier
    cost_profile: Literal[
        "electricity",
        "natural_gas",
        "firewood",
        "pellets",
        "district_heat",
        "other",
    ]
    rated_power_kw: float = Field(gt=0)
    efficiency: float | None = Field(default=None, gt=0, le=1)
    scop: float | None = Field(default=None, gt=1)
    equipment_price_lei: float = Field(ge=0)
    installation_allowance_lei: float = Field(ge=0)
    source_kind: str
    source_url: str | None = None
    confidence: Literal["low", "medium", "high"] = "low"
    requires_hydronic: bool = True
    requires_existing_gas: bool = False
    requires_existing_high_power_electric: bool = False
    requires_existing_biomass_infrastructure: bool = False
    capacity_basis: str = "catalog_nominal_output"
    note: str = ""
    performance_points: list[HeatPumpPerformancePointV1] = Field(default_factory=list)
    seasonal_performance: list[HeatPumpSeasonalPerformanceV1] = Field(default_factory=list)

    @property
    def installed_capex_lei(self) -> float:
        return float(self.equipment_price_lei) + float(self.installation_allowance_lei)


class HeatingParametricNodeV1(BaseModel):
    id: str
    technology_id: str
    technology_label: str
    required_power_kw: float = Field(gt=0)
    planning_capex_lei: float = Field(ge=0)
    source_product_count: int = Field(gt=0)
    min_source_power_kw: float = Field(gt=0)
    max_source_power_kw: float = Field(gt=0)
    interpolation_kind: str
    catalog_signature: str | None = None


class HeatingTechnologyV2(BaseModel):
    id: str
    label: str
    products: list[HeatingPlanningOptionV1]
    parametric_nodes: list[HeatingParametricNodeV1] = Field(default_factory=list)

    @property
    def representative(self) -> HeatingPlanningOptionV1:
        return min(self.products, key=lambda item: (item.rated_power_kw, item.installed_capex_lei))

    @property
    def minimum_capex_lei(self) -> float:
        return min(item.installed_capex_lei for item in self.products)

    @property
    def min_power_kw(self) -> float:
        return min(item.rated_power_kw for item in self.products)

    @property
    def max_power_kw(self) -> float:
        return max(item.rated_power_kw for item in self.products)


class HeatingBranchSummaryV1(BaseModel):
    branch_id: str
    label: str
    fixed_capex_lei: float
    eligible: bool
    economic_eligible: bool = True
    commercialization_mode: str = "product_catalog"
    evaluated_candidates: int = 0
    accepted_candidates: int = 0
    rejected_for_capacity: int = 0
    feasible_candidates: int = 0
    min_product_power_kw: float | None = None
    max_product_power_kw: float | None = None
    sizing_mode: str | None = None
    note: str | None = None


class HeatingBranchRunResultV1(BaseModel):
    selection: OptimizationSelectionV1
    branch: HeatingBranchSummaryV1
    candidates: list[CandidateEvaluationV1] = Field(default_factory=list)
    candidate_count: int
    parametric_evaluations: int
    search_phase: str = "full"
    warnings: list[str] = Field(default_factory=list)


class MixedHeatingOptimizationResultV1(BaseModel):
    selection: OptimizationSelectionV1
    candidates: list[CandidateEvaluationV1]
    parametric_evaluations: int
    heating_branch_evaluations: int
    branches: list[HeatingBranchSummaryV1]
    warnings: list[str] = Field(default_factory=list)


@lru_cache(maxsize=1)
def heating_planning_catalog() -> dict[str, Any]:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def heating_planning_options(
    catalog: dict[str, Any] | None = None,
) -> list[HeatingPlanningOptionV1]:
    raw = catalog or heating_planning_catalog()
    points_by_product: dict[str, list[dict[str, Any]]] = {}
    for point in raw.get("heat_pump_performance_points", []):
        product_id = str(point.get("product_id") or "")
        if product_id:
            points_by_product.setdefault(product_id, []).append(point)
    seasonal_by_product: dict[str, list[dict[str, Any]]] = {}
    for item in raw.get("heat_pump_seasonal_performance", []):
        product_id = str(item.get("product_id") or "")
        if product_id:
            seasonal_by_product.setdefault(product_id, []).append(item)

    options: list[HeatingPlanningOptionV1] = []
    for item in raw.get("options", []):
        product_id = str(item.get("id") or "")
        payload = {
            **item,
            "performance_points": points_by_product.get(product_id, []),
            "seasonal_performance": seasonal_by_product.get(product_id, []),
        }
        options.append(HeatingPlanningOptionV1(**payload))
    return options


def heating_technologies(
    catalog: dict[str, Any] | None = None,
) -> list[HeatingTechnologyV2]:
    raw = catalog or heating_planning_catalog()
    grouped: dict[str, list[HeatingPlanningOptionV1]] = {}
    for item in heating_planning_options(raw):
        grouped.setdefault(item.technology_id, []).append(item)

    nodes_by_technology: dict[str, list[HeatingParametricNodeV1]] = {}
    for raw_node in raw.get("parametric_heating_nodes", []) or []:
        try:
            node = HeatingParametricNodeV1(**raw_node)
        except Exception:
            continue
        nodes_by_technology.setdefault(node.technology_id, []).append(node)

    return [
        HeatingTechnologyV2(
            id=technology_id,
            label=items[0].technology_label,
            products=sorted(
                items,
                key=lambda item: (item.rated_power_kw, item.installed_capex_lei),
            ),
            parametric_nodes=sorted(
                nodes_by_technology.get(technology_id, []),
                key=lambda node: node.required_power_kw,
            ),
        )
        for technology_id, items in grouped.items()
    ]


def _default_details(building: BuildingInput) -> HeatingSystemDetails:
    if building.heating.details is not None:
        return building.heating.details
    return HeatingSystemDetails(
        generator_type=HeatingGeneratorType.condensing_gas_boiler,
        emitter_type=HeatingEmitterType.radiators_high_temp,
        distribution_type=HeatingDistributionType.hydronic_insulated,
        storage_type="none",
        control_type="room_thermostat",
    )


def _is_hydronic(building: BuildingInput) -> bool:
    details = _default_details(building)
    return (
        details.emitter_type.value in HYDRONIC_EMITTERS
        and details.distribution_type.value in HYDRONIC_DISTRIBUTIONS
    )


def _has_existing_gas(building: BuildingInput) -> bool:
    return (
        building.heating.carrier == Carrier.natural_gas
        or building.heating.system_type in {
            HeatingSystemType.gas_boiler,
            HeatingSystemType.condensing_gas_boiler,
        }
    )


def _has_existing_high_power_electric(building: BuildingInput) -> bool:
    details = building.heating.details
    generator = details.generator_type if details is not None else None
    return generator in {
        HeatingGeneratorType.electric_boiler,
        HeatingGeneratorType.heat_pump_air_water,
        HeatingGeneratorType.heat_pump_ground_water,
    }


def _has_existing_biomass_infrastructure(building: BuildingInput) -> bool:
    details = building.heating.details
    generator = details.generator_type if details is not None else None
    return (
        building.heating.carrier == Carrier.biomass
        and generator in {
            HeatingGeneratorType.wood_boiler,
            HeatingGeneratorType.pellet_boiler,
        }
    )


def _same_generator_family(
    building: BuildingInput,
    technology: HeatingTechnologyV2,
) -> bool:
    generator = technology.representative.generator_type
    details = building.heating.details
    if details is not None and details.generator_type is not None:
        return details.generator_type == generator
    if generator in {
        HeatingGeneratorType.heat_pump_air_water,
        HeatingGeneratorType.heat_pump_ground_water,
        HeatingGeneratorType.heat_pump_air_air,
    }:
        return (
            building.heating.system_type == HeatingSystemType.heat_pump
            and (
                building.heating.details is None
                or building.heating.details.generator_type == generator
            )
        )
    if generator == HeatingGeneratorType.condensing_gas_boiler:
        return building.heating.system_type == HeatingSystemType.condensing_gas_boiler
    return False


def _product_infrastructure_eligible(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> bool:
    if product.requires_hydronic and not _is_hydronic(building):
        return False
    if product.requires_existing_gas and not _has_existing_gas(building):
        return False
    if (
        product.requires_existing_high_power_electric
        and not _has_existing_high_power_electric(building)
    ):
        return False
    if (
        product.requires_existing_biomass_infrastructure
        and not _has_existing_biomass_infrastructure(building)
    ):
        return False
    return True


def technology_is_eligible(
    building: BuildingInput,
    technology: HeatingTechnologyV2,
) -> tuple[bool, str | None]:
    if _same_generator_family(building, technology):
        return False, (
            "Aceeași familie de generator este deja instalată; păstrarea sistemului "
            "actual este evaluată separat cu CAPEX zero."
        )
    if any(_product_infrastructure_eligible(building, product) for product in technology.products):
        return True, None

    representative = technology.representative
    if representative.requires_hydronic and not _is_hydronic(building):
        return False, (
            "Sistemul necesită o instalație hidronică existentă; conversia "
            "emitatoarelor nu este încă inclusă."
        )
    if representative.requires_existing_gas and not _has_existing_gas(building):
        return False, "Gazul nu este confirmat ca disponibil în configurația casei."
    if all(product.requires_existing_high_power_electric for product in technology.products):
        return False, (
            "Puterea electrică necesară nu este confirmată; niciuna dintre treptele "
            "comerciale disponibile nu este eligibilă."
        )
    if representative.requires_existing_biomass_infrastructure:
        return False, (
            "Coșul, spațiul tehnic și logistica de combustibil pentru biomasă nu sunt "
            "confirmate."
        )
    return False, "Infrastructura necesară tehnologiei nu este confirmată."


def _heating_details_for_product(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> dict[str, Any]:
    current = _default_details(building)
    data = model_to_dict(current)
    data["generator_type"] = product.generator_type.value
    data["auxiliary_electricity_kwh_year"] = None
    if product.generator_type == HeatingGeneratorType.heat_pump_air_air:
        # A split air-air unit is itself the emitter/distribution path. Do not
        # inherit radiators or a hydronic circuit from the baseline house.
        data.update(
            {
                "emitter_type": HeatingEmitterType.air.value,
                "distribution_type": HeatingDistributionType.air.value,
                "storage_type": "none",
                "control_type": "room_thermostat",
                "design_flow_temperature_c": None,
                "design_return_temperature_c": None,
            }
        )
    return data


def _dhw_for_product(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> dict[str, Any]:
    dhw = model_to_dict(building.dhw)
    if not dhw.get("enabled") or dhw.get("system_type") != "same_as_heating":
        return dhw

    defaults = methodology()["dhw"]["system_defaults"]
    if product.generator_type == HeatingGeneratorType.heat_pump_air_air:
        # Air-air space heating does not heat domestic hot water. Preserve the
        # baseline DHW performance instead of silently inventing a DHW heat pump.
        dhw["system_type"] = "custom"
        return dhw
    if product.system_type == HeatingSystemType.heat_pump:
        cfg = defaults["heat_pump_water_heater"]
        dhw["cop"] = float(cfg["cop"])
        dhw["efficiency"] = None
        dhw["carrier"] = "electricity"
    elif product.generator_type == HeatingGeneratorType.electric_boiler:
        cfg = defaults["electric_boiler"]
        dhw["cop"] = None
        dhw["efficiency"] = float(cfg["efficiency"])
        dhw["carrier"] = "electricity"
    elif product.system_type == HeatingSystemType.condensing_gas_boiler:
        cfg = defaults["gas_boiler"]
        dhw["cop"] = None
        dhw["efficiency"] = float(cfg["efficiency"])
        dhw["carrier"] = "natural_gas"
    else:
        dhw["cop"] = None
        dhw["efficiency"] = float(product.efficiency or 0.88)
        dhw["carrier"] = product.carrier.value
    return dhw


def apply_heating_technology(
    building: BuildingInput,
    technology: HeatingTechnologyV2,
) -> BuildingInput:
    product = technology.representative
    payload = model_to_dict(building)
    payload["heating"] = model_to_dict(
        HeatingInput(
            system_type=product.system_type,
            carrier=product.carrier,
            efficiency=product.efficiency,
            scop=product.scop,
            details=HeatingSystemDetails(**_heating_details_for_product(building, product)),
            cost_profile=product.cost_profile,
        )
    )
    payload["dhw"] = _dhw_for_product(building, product)
    return BuildingInput(**payload)


def _supplemental_branch_eligible(
    building: BuildingInput,
    branch_id: str,
) -> tuple[bool, str | None]:
    profile = SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES.get(branch_id)
    if profile is None:
        return False, "Ramură tehnică necunoscută."

    details = building.heating.details
    current_generator = details.generator_type if details is not None else None
    target_generator = profile["generator_type"]
    if current_generator == target_generator:
        return False, (
            "Aceeași familie de generator este deja instalată; păstrarea sistemului "
            "actual este evaluată separat."
        )

    if bool(profile.get("requires_hydronic")) and not _is_hydronic(building):
        return False, (
            "Ramura sol-apă necesită momentan o distribuție hidronică existentă. "
            "Conversia emitatoarelor va deveni o intervenție parametrică separată."
        )
    return True, None


def _dhw_for_supplemental_branch(
    building: BuildingInput,
    branch_id: str,
) -> dict[str, Any]:
    dhw = model_to_dict(building.dhw)
    if not dhw.get("enabled") or dhw.get("system_type") != "same_as_heating":
        return dhw

    # Air-air heat pumps do not implicitly become a DHW heat pump. Preserve the
    # baseline hot-water performance as a separate custom service rather than
    # silently inventing a new DHW technology.
    if branch_id == "heat-pump-air-air":
        dhw["system_type"] = "custom"
        return dhw

    cfg = methodology()["dhw"]["system_defaults"]["heat_pump_water_heater"]
    dhw["system_type"] = "heat_pump_water_heater"
    dhw["cop"] = float(cfg["cop"])
    dhw["efficiency"] = None
    dhw["carrier"] = "electricity"
    return dhw


def apply_supplemental_heating_technology(
    building: BuildingInput,
    branch_id: str,
) -> BuildingInput:
    profile = SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES.get(branch_id)
    if profile is None:
        raise ValueError(f"Unknown supplemental heating branch {branch_id!r}.")

    payload = model_to_dict(building)
    current = _default_details(building)
    details = model_to_dict(current)
    details["generator_type"] = profile["generator_type"].value
    details["auxiliary_electricity_kwh_year"] = None

    if branch_id == "heat-pump-air-air":
        details.update(
            {
                "emitter_type": HeatingEmitterType.air.value,
                "distribution_type": HeatingDistributionType.air.value,
                "storage_type": "none",
                "control_type": "room_thermostat",
                "design_flow_temperature_c": None,
                "design_return_temperature_c": None,
            }
        )

    payload["heating"] = model_to_dict(
        HeatingInput(
            system_type=profile["system_type"],
            carrier=profile["carrier"],
            efficiency=None,
            scop=None,
            details=HeatingSystemDetails(**details),
            cost_profile=profile["cost_profile"],
        )
    )
    payload["dhw"] = _dhw_for_supplemental_branch(building, branch_id)
    return BuildingInput(**payload)


def _required_generator_power_kw(candidate: CandidateEvaluationV1) -> float | None:
    if candidate.design_heat_load_kw is None:
        return None
    # EN 12831-style basis: cover the design heat load at the normative winter
    # design condition. No universal oversizing percentage is added. Optional
    # reheating capacity belongs to a separate intermittent-heating model.
    return max(float(candidate.design_heat_load_kw), 0.0)


def _product_available_capacity_at_design_kw(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> tuple[float | None, str]:
    """Return generator capacity available at the building design condition.

    Non-heat-pump products use their catalog rated output. Heat pumps use
    source-backed capacity points when those points actually bracket the
    locality winter design temperature and the required hydronic flow
    temperature. We deliberately do not clamp/extrapolate capacity beyond the
    published operating map for equipment sufficiency checks.
    """

    if product.generator_type not in {
        HeatingGeneratorType.heat_pump_air_water,
        HeatingGeneratorType.heat_pump_air_air,
        HeatingGeneratorType.heat_pump_ground_water,
    }:
        return float(product.rated_power_kw), "catalog_rated_output"

    capacity_points = [
        point for point in product.performance_points
        if point.heating_capacity_kw is not None
    ]
    if not capacity_points:
        return float(product.rated_power_kw), "catalog_rated_output_unverified_at_design_point"

    climate = resolve_climate(building.locality)
    design_outdoor = climate.get("winter_design_temperature_c")
    if design_outdoor is None:
        return float(product.rated_power_kw), "catalog_rated_output_missing_design_climate"

    design_outdoor = float(design_outdoor)

    if product.generator_type == HeatingGeneratorType.heat_pump_air_air:
        outdoor_values = sorted(
            {float(point.outdoor_temperature_c) for point in capacity_points}
        )
        if (
            not outdoor_values
            or design_outdoor < outdoor_values[0] - 1e-9
            or design_outdoor > outdoor_values[-1] + 1e-9
        ):
            return None, "capacity_curve_does_not_cover_design_temperature"
        capacity, clamped = _interpolate_air_air_metric(
            capacity_points,
            outdoor_temperature_c=design_outdoor,
            metric="heating_capacity_kw",
        )
        if capacity is None or clamped:
            return None, "capacity_curve_does_not_cover_design_temperature"
        return float(capacity), "manufacturer_capacity_curve_at_design_temperature"

    if product.generator_type == HeatingGeneratorType.heat_pump_air_water:
        design_flow_c, _, _ = _heat_pump_design_temperatures(building)
        outdoor_values = sorted(
            {float(point.outdoor_temperature_c) for point in capacity_points}
        )
        flow_values = sorted(
            {float(point.flow_temperature_c) for point in capacity_points}
        )
        if (
            not outdoor_values
            or design_outdoor < outdoor_values[0] - 1e-9
            or design_outdoor > outdoor_values[-1] + 1e-9
        ):
            return None, "capacity_curve_does_not_cover_design_temperature"
        if (
            not flow_values
            or design_flow_c < flow_values[0] - 1e-9
            or design_flow_c > flow_values[-1] + 1e-9
        ):
            return None, "capacity_curve_does_not_cover_design_flow_temperature"
        capacity = _interpolate_heat_pump_metric(
            capacity_points,
            outdoor_temperature_c=design_outdoor,
            flow_temperature_c=design_flow_c,
            metric="heating_capacity_kw",
        )
        if capacity is None:
            return None, "capacity_curve_not_interpolable_at_design_point"
        return float(capacity), "manufacturer_capacity_curve_at_design_air_water_point"

    # Ground-source output depends on source-side conditions that are not
    # represented by outdoor-air temperature in the current catalog schema.
    return float(product.rated_power_kw), "catalog_rated_output_ground_source_design_curve_unavailable"


def _select_sized_product(
    building: BuildingInput,
    technology: HeatingTechnologyV2,
    required_power_kw: float,
) -> tuple[HeatingPlanningOptionV1, float, str] | None:
    candidates: list[tuple[HeatingPlanningOptionV1, float, str]] = []
    for product in technology.products:
        if not _product_infrastructure_eligible(building, product):
            continue
        available_kw, basis = _product_available_capacity_at_design_kw(
            building,
            product,
        )
        if available_kw is None:
            continue
        if product.generator_type in {
            HeatingGeneratorType.heat_pump_air_water,
            HeatingGeneratorType.heat_pump_air_air,
            HeatingGeneratorType.heat_pump_ground_water,
        } and any(
            marker in str(basis)
            for marker in (
                "unverified",
                "unavailable",
                "missing",
                "does_not_cover",
                "not_interpolable",
            )
        ):
            # Keep incomplete retail SKUs in D1 for market coverage and CAPEX
            # parametrization, but do not present them as design-verified
            # equipment at the Romanian winter design condition.
            continue
        if float(available_kw) + 1e-9 < float(required_power_kw):
            continue
        candidates.append((product, float(available_kw), basis))

    if not candidates:
        return None
    return min(
        candidates,
        key=lambda item: (
            float(item[0].rated_power_kw),
            float(item[0].installed_capex_lei),
        ),
    )


def _heat_pump_design_temperatures(
    building: BuildingInput,
) -> tuple[float, float, float]:
    details = _default_details(building)
    emitter_cfg = methodology()["heating_system_chain_light"]["emitters"][
        details.emitter_type.value
    ]
    flow_c = float(
        details.design_flow_temperature_c
        if details.design_flow_temperature_c is not None
        else emitter_cfg["flow_c"]
    )
    return_c = float(
        details.design_return_temperature_c
        if details.design_return_temperature_c is not None
        else emitter_cfg["return_c"]
    )
    return flow_c, return_c, max(flow_c - return_c, 1.0)


def _weather_compensated_flow_temperature_c(
    building: BuildingInput,
    *,
    outdoor_temperature_c: float,
    winter_design_temperature_c: float,
) -> tuple[float, float]:
    design_flow_c, design_return_c, design_delta_t_k = _heat_pump_design_temperatures(
        building
    )
    indoor_c = float(building.indoor_design_temperature_c)
    # Light Engine estimate: at zero space-heating load the circuit approaches
    # a low hydronic floor, while at the normative winter design point it reaches
    # the emitter design flow temperature. It is deliberately exposed as an
    # assumption until emitter-by-emitter EN 442 / EN 1264 data is collected.
    emitter = _default_details(building).emitter_type
    min_flow_by_emitter = {
        HeatingEmitterType.underfloor: 25.0,
        HeatingEmitterType.radiators_low_temp: 30.0,
        HeatingEmitterType.fan_coils: 30.0,
        HeatingEmitterType.radiators_high_temp: 35.0,
    }
    min_flow_c = min(
        design_flow_c,
        min_flow_by_emitter.get(emitter, max(25.0, indoor_c + 5.0)),
    )
    denominator = max(indoor_c - float(winter_design_temperature_c), 1.0)
    load_fraction = (
        indoor_c - float(outdoor_temperature_c)
    ) / denominator
    load_fraction = min(max(load_fraction, 0.0), 1.0)
    flow_c = min_flow_c + load_fraction * (design_flow_c - min_flow_c)
    # Keep the design delta-T as the MVP hydronic assumption. The D1 schema
    # stores return temperature / delta-T when manufacturer data provides it.
    return_c = flow_c - design_delta_t_k
    return flow_c, return_c


def _interpolate_heat_pump_metric(
    points: list[HeatPumpPerformancePointV1],
    *,
    outdoor_temperature_c: float,
    flow_temperature_c: float,
    metric: Literal["cop", "heating_capacity_kw"],
) -> float | None:
    rows: list[tuple[float, float, float]] = []
    for point in points:
        value = getattr(point, metric)
        if value is None:
            continue
        rows.append(
            (
                float(point.outdoor_temperature_c),
                float(point.flow_temperature_c),
                float(value),
            )
        )
    if not rows:
        return None

    outdoor_values = sorted({row[0] for row in rows})
    flow_values = sorted({row[1] for row in rows})
    query_outdoor = min(max(float(outdoor_temperature_c), outdoor_values[0]), outdoor_values[-1])
    query_flow = min(max(float(flow_temperature_c), flow_values[0]), flow_values[-1])

    # Do not pretend that a W35-only curve describes a radiator circuit at W55.
    if len(flow_values) == 1 and abs(query_flow - float(flow_temperature_c)) > 2.0:
        return None

    for outdoor, flow, value in rows:
        if abs(outdoor - query_outdoor) < 1e-9 and abs(flow - query_flow) < 1e-9:
            return value

    # Sparse manufacturer tables are common. Inverse-distance interpolation
    # provides a deterministic MVP over the available A/W operating points
    # without manufacturing synthetic catalogue points.
    weighted = 0.0
    weight_sum = 0.0
    for outdoor, flow, value in rows:
        distance_sq = ((outdoor - query_outdoor) / 10.0) ** 2 + (
            (flow - query_flow) / 10.0
        ) ** 2
        weight = 1.0 / max(distance_sq, 0.01)
        weighted += value * weight
        weight_sum += weight
    return weighted / weight_sum if weight_sum > 0 else None


def _interpolate_heat_pump_metric_strict(
    points: list[HeatPumpPerformancePointV1],
    *,
    outdoor_temperature_c: float,
    flow_temperature_c: float,
    metric: Literal["cop", "heating_capacity_kw"],
) -> tuple[float | None, bool]:
    """Interpolate only inside the manufacturer-published A/W domain."""

    rows = [
        point
        for point in points
        if getattr(point, metric) is not None
    ]
    if not rows:
        return None, False

    outdoor_values = sorted(
        {float(point.outdoor_temperature_c) for point in rows}
    )
    flow_values = sorted(
        {float(point.flow_temperature_c) for point in rows}
    )
    outdoor = float(outdoor_temperature_c)
    flow = float(flow_temperature_c)
    outside = bool(
        outdoor < outdoor_values[0] - 1e-9
        or outdoor > outdoor_values[-1] + 1e-9
        or flow < flow_values[0] - 1e-9
        or flow > flow_values[-1] + 1e-9
    )
    if outside:
        return None, True

    value = _interpolate_heat_pump_metric(
        points,
        outdoor_temperature_c=outdoor,
        flow_temperature_c=flow,
        metric=metric,
    )
    return value, False


def _declared_seasonal_scop_for_building(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> tuple[float | None, str | None]:
    """Resolve source-backed seasonal SCOP before any generic Light fallback."""

    if product.scop is not None:
        return float(product.scop), "product_declared_scop"
    if not product.seasonal_performance:
        return None, None

    target_application_c = 35.0
    if product.generator_type == HeatingGeneratorType.heat_pump_air_water:
        target_application_c, _, _ = _heat_pump_design_temperatures(building)

    preferred = sorted(
        product.seasonal_performance,
        key=lambda item: (
            0 if str(item.climate).lower() == "average" else 1,
            abs(
                float(item.application_temperature_c)
                - float(target_application_c)
            ),
        ),
    )
    if not preferred:
        return None, None

    selected = preferred[0]
    return (
        float(selected.scop),
        (
            f"{selected.test_standard or 'seasonal manufacturer data'}: "
            f"SCOP {float(selected.scop):.2f} at "
            f"{float(selected.application_temperature_c):.0f}°C application "
            f"({selected.climate} climate)"
        ),
    )


def _interpolate_air_air_metric(
    points: list[HeatPumpPerformancePointV1],
    *,
    outdoor_temperature_c: float,
    metric: Literal["cop", "heating_capacity_kw"],
) -> tuple[float | None, bool]:
    """Interpolate an air-air performance curve on outdoor temperature only."""

    by_temperature: dict[float, list[float]] = {}
    for point in points:
        value = getattr(point, metric)
        if value is None:
            continue
        by_temperature.setdefault(
            float(point.outdoor_temperature_c), []
        ).append(float(value))
    curve = sorted(
        (temperature, sum(values) / len(values))
        for temperature, values in by_temperature.items()
    )
    if not curve:
        return None, False
    if len(curve) == 1:
        return curve[0][1], True

    raw_query = float(outdoor_temperature_c)
    query = min(max(raw_query, curve[0][0]), curve[-1][0])
    clamped = abs(query - raw_query) > 1e-9
    for temperature, value in curve:
        if abs(temperature - query) < 1e-9:
            return value, clamped
    for index in range(1, len(curve)):
        low_t, low_v = curve[index - 1]
        high_t, high_v = curve[index]
        if query <= high_t + 1e-9:
            span = high_t - low_t
            if span <= 1e-9:
                return high_v, clamped
            fraction = (query - low_t) / span
            return low_v + fraction * (high_v - low_v), clamped
    return curve[-1][1], clamped


def _estimated_heat_pump_scop(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> tuple[float | None, list[str]]:
    """Estimate local seasonal COP only from the published COP domain.

    Monthly climate points outside the manufacturer curve are never clamped to
    the nearest endpoint. If less than 90% of the degree-day heating weight is
    covered, the function refuses to manufacture a local SCOP.
    """

    if product.generator_type not in {
        HeatingGeneratorType.heat_pump_air_water,
        HeatingGeneratorType.heat_pump_air_air,
    }:
        return None, []
    if not product.performance_points:
        return None, [
            f"{product.label}: nu există puncte COP source-backed suficiente pentru SCOP local."
        ]

    unique_outdoor = {
        float(point.outdoor_temperature_c)
        for point in product.performance_points
    }
    if len(unique_outdoor) < 2:
        return None, [
            f"{product.label}: există doar un COP de referință, nu o curbă COP sezonieră."
        ]

    climate = resolve_climate(building.locality)
    design_outdoor = climate.get("winter_design_temperature_c")
    months = climate.get("monthly_temperatures") or []
    if design_outdoor is None or not months:
        return None, [
            f"{product.label}: profilul climatic nu permite calculul SCOP specific produsului."
        ]

    total_heat_weight = 0.0
    covered_heat_weight = 0.0
    total_electric_weight = 0.0
    used_points = 0

    for month in months:
        outdoor = float(month["temperature_c"])
        days = float(month["days"])
        load_weight = max(
            float(building.indoor_design_temperature_c) - outdoor,
            0.0,
        ) * days
        if load_weight <= 0:
            continue
        total_heat_weight += load_weight

        outside_curve = False
        if product.generator_type == HeatingGeneratorType.heat_pump_air_air:
            cop, outside_curve = _interpolate_air_air_metric(
                product.performance_points,
                outdoor_temperature_c=outdoor,
                metric="cop",
            )
            if outside_curve:
                cop = None
        else:
            flow_c, _ = _weather_compensated_flow_temperature_c(
                building,
                outdoor_temperature_c=outdoor,
                winter_design_temperature_c=float(design_outdoor),
            )
            cop, outside_curve = _interpolate_heat_pump_metric_strict(
                product.performance_points,
                outdoor_temperature_c=outdoor,
                flow_temperature_c=flow_c,
                metric="cop",
            )

        if outside_curve or cop is None or cop <= 1.0:
            continue

        covered_heat_weight += load_weight
        total_electric_weight += load_weight / float(cop)
        used_points += 1

    coverage_ratio = (
        covered_heat_weight / total_heat_weight
        if total_heat_weight > 0
        else 0.0
    )
    if (
        used_points < 3
        or total_electric_weight <= 0
        or coverage_ratio < 0.90
    ):
        return None, [
            (
                f"{product.label}: curba COP source-backed acoperă "
                f"{coverage_ratio * 100:.1f}% din ponderarea climatică de încălzire; "
                "SCOP-ul local nu este extrapolat."
            )
        ]

    scop = covered_heat_weight / total_electric_weight
    topology = (
        "curba COP aer-aer"
        if product.generator_type == HeatingGeneratorType.heat_pump_air_air
        else "punctele COP A/W și curba climatică tur/retur"
    )
    return round(scop, 4), [
        (
            f"{product.label}: SCOP local {scop:.2f} din {topology}, cu "
            f"{coverage_ratio * 100:.1f}% acoperire source-backed a ponderării de încălzire."
        )
    ]


def heat_pump_monthly_performance_profile(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
    monthly_rows: list[Any],
) -> dict[str, Any] | None:
    """Expose monthly COP without extrapolating outside published data."""

    if product.generator_type not in {
        HeatingGeneratorType.heat_pump_air_water,
        HeatingGeneratorType.heat_pump_air_air,
        HeatingGeneratorType.heat_pump_ground_water,
    }:
        return None

    points = list(product.performance_points)
    unique_outdoor = sorted(
        {float(point.outdoor_temperature_c) for point in points}
    )
    has_curve = len(unique_outdoor) >= 2
    climate = resolve_climate(building.locality)
    design_outdoor = climate.get("winter_design_temperature_c")

    design_flow_c: float | None = None
    design_return_c: float | None = None
    design_cop: float | None = None
    design_capacity_kw: float | None = None
    design_capacity_basis: str | None = None
    design_point_covered = False

    if design_outdoor is not None:
        available_capacity, capacity_basis = (
            _product_available_capacity_at_design_kw(building, product)
        )
        design_capacity_basis = capacity_basis
        capacity_verified = (
            available_capacity is not None
            and not any(
                marker in capacity_basis
                for marker in (
                    "unverified",
                    "unavailable",
                    "missing",
                    "does_not_cover",
                    "not_interpolable",
                )
            )
        )
        if capacity_verified:
            design_capacity_kw = float(available_capacity)

        cop_verified = False
        if product.generator_type == HeatingGeneratorType.heat_pump_air_air:
            cop_value, cop_outside = _interpolate_air_air_metric(
                points,
                outdoor_temperature_c=float(design_outdoor),
                metric="cop",
            )
            if cop_value is not None and not cop_outside:
                design_cop = float(cop_value)
                cop_verified = True
        elif product.generator_type == HeatingGeneratorType.heat_pump_air_water:
            design_flow_c, design_return_c, _ = (
                _heat_pump_design_temperatures(building)
            )
            cop_value, cop_outside = _interpolate_heat_pump_metric_strict(
                points,
                outdoor_temperature_c=float(design_outdoor),
                flow_temperature_c=design_flow_c,
                metric="cop",
            )
            if cop_value is not None and not cop_outside:
                design_cop = float(cop_value)
                cop_verified = True

        design_point_covered = bool(capacity_verified and cop_verified)

    source_urls = sorted(
        ({str(product.source_url)} if product.source_url else set())
        | {str(point.source_url) for point in points if point.source_url}
        | {
            str(item.source_url)
            for item in product.seasonal_performance
            if item.source_url
        }
    )
    standards = sorted(
        {str(point.test_standard) for point in points if point.test_standard}
        | {
            str(item.test_standard)
            for item in product.seasonal_performance
            if item.test_standard
        }
    )

    reference_cop_at_7c = None
    if points:
        nominal_point = min(
            points,
            key=lambda point: abs(float(point.outdoor_temperature_c) - 7.0),
        )
        if abs(float(nominal_point.outdoor_temperature_c) - 7.0) <= 0.6:
            reference_cop_at_7c = float(nominal_point.cop)

    rows: list[dict[str, Any]] = []
    total_useful = 0.0
    covered_useful = 0.0
    total_electric = 0.0
    outside_curve_months = 0
    used_cop_months = 0

    for raw in monthly_rows:
        if isinstance(raw, dict):
            month = str(raw.get("month") or "")
            outdoor = float(raw.get("outdoor_temperature_c") or 0.0)
            useful = float(raw.get("useful_heating_kwh") or 0.0)
        else:
            month = str(getattr(raw, "month", ""))
            outdoor = float(
                getattr(raw, "outdoor_temperature_c", 0.0)
            )
            useful = float(getattr(raw, "useful_heating_kwh", 0.0))

        if useful > 0:
            total_useful += useful

        flow_c: float | None = None
        cop: float | None = None
        outside_curve = False

        if (
            has_curve
            and product.generator_type == HeatingGeneratorType.heat_pump_air_air
        ):
            cop, outside_curve = _interpolate_air_air_metric(
                points,
                outdoor_temperature_c=outdoor,
                metric="cop",
            )
            if outside_curve:
                cop = None
        elif (
            has_curve
            and product.generator_type == HeatingGeneratorType.heat_pump_air_water
            and design_outdoor is not None
        ):
            flow_c, _ = _weather_compensated_flow_temperature_c(
                building,
                outdoor_temperature_c=outdoor,
                winter_design_temperature_c=float(design_outdoor),
            )
            cop, outside_curve = _interpolate_heat_pump_metric_strict(
                points,
                outdoor_temperature_c=outdoor,
                flow_temperature_c=flow_c,
                metric="cop",
            )

        electric = None
        if outside_curve and useful > 0:
            outside_curve_months += 1
        if cop is not None and cop > 1.0 and useful > 0:
            electric = useful / float(cop)
            covered_useful += useful
            total_electric += electric
            used_cop_months += 1

        rows.append(
            {
                "month": month,
                "outdoor_temperature_c": round(outdoor, 3),
                "useful_heating_kwh": round(useful, 3),
                "flow_temperature_c": (
                    None if flow_c is None else round(float(flow_c), 2)
                ),
                "cop": None if cop is None else round(float(cop), 4),
                "estimated_compressor_electricity_kwh": (
                    None if electric is None else round(electric, 3)
                ),
                "outside_published_curve": bool(outside_curve),
                "source_clamped": False,
            }
        )

    coverage_ratio = (
        covered_useful / total_useful
        if total_useful > 0
        else 0.0
    )
    modeled_scop = (
        covered_useful / total_electric
        if (
            covered_useful > 0
            and total_electric > 0
            and coverage_ratio >= 0.90
        )
        else None
    )
    profile_kind = (
        "cop_curve"
        if used_cop_months >= 2 and coverage_ratio >= 0.90
        else "scop_only"
    )

    if profile_kind == "scop_only":
        for row in rows:
            row["cop"] = None
            row["estimated_compressor_electricity_kwh"] = None
        modeled_scop = None

    declared_scop, declared_scop_basis = (
        _declared_seasonal_scop_for_building(building, product)
    )
    note = (
        "COP lunar este interpolat numai în domeniul source-backed publicat; "
        "SCOP modelat = ΣQutil/Σ(Qutil/COP_lunar)."
        if profile_kind == "cop_curve"
        else (
            "Curba COP nu acoperă suficient profilul local fără extrapolare. "
            "Se raportează separat SCOP-ul sezonier source-backed, dacă există."
        )
    )
    if outside_curve_months:
        note += (
            f" {outside_curve_months} luni cu sarcină sunt în afara curbei "
            "publicate și nu sunt extrapolate."
        )
    note += (
        f" Acoperire energetică a curbei: {coverage_ratio * 100:.1f}%."
    )

    return {
        "product_id": product.id,
        "product_label": product.label,
        "generator_type": product.generator_type.value,
        "profile_kind": profile_kind,
        "declared_scop": (
            None if declared_scop is None else round(float(declared_scop), 4)
        ),
        "declared_scop_basis": declared_scop_basis,
        "modeled_scop_from_monthly_cop": (
            None if modeled_scop is None else round(modeled_scop, 4)
        ),
        "cop_curve_heating_energy_coverage_percent": round(
            coverage_ratio * 100.0,
            2,
        ),
        "outside_curve_heating_months": int(outside_curve_months),
        "reference_cop_at_7c": (
            None
            if reference_cop_at_7c is None
            else round(reference_cop_at_7c, 4)
        ),
        "design_point": {
            "covered": bool(design_point_covered),
            "outdoor_temperature_c": (
                None
                if design_outdoor is None
                else round(float(design_outdoor), 2)
            ),
            "flow_temperature_c": (
                None if design_flow_c is None else round(float(design_flow_c), 2)
            ),
            "return_temperature_c": (
                None
                if design_return_c is None
                else round(float(design_return_c), 2)
            ),
            "cop": None if design_cop is None else round(float(design_cop), 4),
            "heating_capacity_kw": (
                None
                if design_capacity_kw is None
                else round(float(design_capacity_kw), 4)
            ),
            "capacity_basis": design_capacity_basis,
        },
        "cop_curve_min_outdoor_c": (
            None if not unique_outdoor else unique_outdoor[0]
        ),
        "cop_curve_max_outdoor_c": (
            None if not unique_outdoor else unique_outdoor[-1]
        ),
        "seasonal_performance_points": [
            {
                "climate": item.climate,
                "application_temperature_c": float(
                    item.application_temperature_c
                ),
                "scop": float(item.scop),
                "design_load_kw": (
                    None
                    if item.design_load_kw is None
                    else float(item.design_load_kw)
                ),
                "test_standard": item.test_standard,
                "source_url": item.source_url,
            }
            for item in product.seasonal_performance
        ],
        "monthly": rows,
        "source_urls": source_urls,
        "test_standards": standards,
        "note": note,
    }


def _stable_mixed_id(
    candidate_id: str,
    branch_id: str,
    product_id: str | None = None,
) -> str:
    raw = f"{branch_id}:{product_id or 'existing'}:{candidate_id}".encode("utf-8")
    return "OPT-MIX-" + hashlib.sha256(raw).hexdigest()[:12].upper()


def _planning_heating_capex(
    building: BuildingInput,
    technology: HeatingTechnologyV2,
    required_power_kw: float,
) -> tuple[float, float, float, int] | None:
    """Interpolate a raw kW->CAPEX curve without selecting a commercial SKU.

    Product observations are used only as market points for the planning curve.
    The optimizer therefore stays continuous in required design power. Real
    generator selection is intentionally deferred until after the economic
    finalist has been chosen.
    """

    eligible_products = [
        product
        for product in technology.products
        if _product_infrastructure_eligible(building, product)
    ]
    if not eligible_products:
        return None

    use_dense_grid = (
        bool(technology.parametric_nodes)
        and len(eligible_products) == len(technology.products)
    )
    if use_dense_grid:
        points = [
            (float(node.required_power_kw), float(node.planning_capex_lei))
            for node in technology.parametric_nodes
        ]
        source_point_count = max(
            (
                int(node.source_product_count)
                for node in technology.parametric_nodes
            ),
            default=len(eligible_products),
        )
    else:
        by_power: dict[float, float] = {}
        for product in eligible_products:
            power = float(product.rated_power_kw)
            capex = float(product.installed_capex_lei)
            previous = by_power.get(power)
            if previous is None or capex < previous:
                by_power[power] = capex
        points = sorted(by_power.items())
        source_point_count = len(points)

    if not points:
        return None
    min_power = float(points[0][0])
    max_power = float(points[-1][0])
    target = max(float(required_power_kw), 0.0)
    if target <= min_power + 1e-9:
        return round(float(points[0][1]), 2), min_power, max_power, len(points)

    lower_power, lower_cost = points[0]
    upper_power, upper_cost = points[-1]
    if target > max_power + 1e-9 and len(points) >= 2:
        # Raw optimization must not discard a technically valid candidate only
        # because today's catalog stops at a smaller commercial step. Extend
        # the market-derived planning curve using the last two observed points;
        # the finalist product-matching stage remains free to report that no
        # real SKU covers the resulting design load.
        lower_power, lower_cost = points[-2]
        upper_power, upper_cost = points[-1]
    else:
        for index in range(1, len(points)):
            candidate_upper = points[index]
            if target <= float(candidate_upper[0]) + 1e-9:
                lower_power, lower_cost = points[index - 1]
                upper_power, upper_cost = candidate_upper
                break

    span = float(upper_power) - float(lower_power)
    if span <= 1e-9:
        interpolated = float(upper_cost)
    else:
        slope = (
            float(upper_cost) - float(lower_cost)
        ) / span
        if target > max_power + 1e-9 and slope < 0:
            # Never extrapolate a locally cheaper larger SKU into an
            # economically impossible negative generator price. Above the
            # observed catalog range, a negative terminal slope is treated as
            # a flat planning allowance at the last source-backed observation.
            interpolated = float(upper_cost)
        else:
            interpolated = float(lower_cost) + (
                target - float(lower_power)
            ) * slope
    return (
        round(max(interpolated, 0.0), 2),
        min_power,
        max_power,
        source_point_count,
    )


def _rebase_candidate(
    candidate: CandidateEvaluationV1,
    *,
    original_baseline_bill_lei: float,
    original_building: BuildingInput,
    technology: HeatingTechnologyV2 | None,
    branch_id_override: str | None = None,
) -> CandidateEvaluationV1 | None:
    """Attach branch economics without commercializing the generator.

    The expensive V3 path selected a real product for every raw candidate and,
    for air-water heat pumps, could run the complete building engine a second
    time with product-specific COP data. That mixed mathematical search and
    commercialization and amplified Cloudflare CPU pressure. V4 keeps the raw
    technology calculation authoritative here; product matching happens only
    for finalists.
    """

    lines = [line for line in candidate.cost_breakdown if line.family != "heating"]
    assumptions = list(candidate.assumptions)
    warnings = list(candidate.warnings)
    branch_id = branch_id_override or "keep-current-heating"
    required_power_kw = _required_generator_power_kw(candidate)

    if technology is not None:
        branch_id = technology.id
        if required_power_kw is None:
            return None

        planning = _planning_heating_capex(
            original_building,
            technology,
            required_power_kw,
        )
        if planning is None:
            return None
        planning_capex, min_power, max_power, point_count = planning
        lines.append(
            CostLineV1(
                family="heating",
                capex_lei=round(planning_capex, 2),
                parameter_value=round(float(required_power_kw), 4),
                parameter_unit="kW_design_required",
                source_kind="product_derived_parametric_curve",
                source_url=None,
                confidence="market_derived",
                catalog_unit="lei_total_as_function_of_design_kW",
                note=(
                    f"{technology.label}: necesar termic recalculat "
                    f"{required_power_kw:.2f} kW; CAPEX parametric interpolat din "
                    f"{point_count} trepte comerciale observate pe plaja "
                    f"{min_power:.2f}–{max_power:.2f} kW. Niciun SKU nu este selectat "
                    "în această etapă."
                ),
            )
        )
        assumptions.extend(
            [
                f"Heating technology branch: {technology.label}.",
                (
                    f"Generator design power is recalculated for this complete candidate: "
                    f"{required_power_kw:.2f} kW."
                ),
                "No arbitrary fixed oversizing factor is applied.",
                (
                    "Heating CAPEX is a continuous planning curve derived from real catalog "
                    "observations; real product/SKU selection is deferred until finalist "
                    "commercialization."
                ),
                "Existing emitters/distribution are preserved unless the technical branch explicitly changes them.",
            ]
        )

        generator = technology.representative.generator_type
        if generator == HeatingGeneratorType.heat_pump_air_water:
            warnings.append(
                "Raw air-water heat-pump search uses the technology-level LaCurent Light "
                "performance model. Manufacturer COP/capacity curves are intentionally "
                "deferred to finalist product matching, so the engine is not rerun once per SKU."
            )
        if generator == HeatingGeneratorType.condensing_gas_boiler:
            warnings.append(
                "Minimum modulation power remains a finalist/product check; the raw branch "
                "sizes only the required design capacity."
            )
        if generator == HeatingGeneratorType.electric_boiler:
            warnings.append(
                "Electrical service capacity/protection remains a downstream implementation check."
            )
        if generator == HeatingGeneratorType.pellet_boiler:
            warnings.append(
                "Chimney, plant-room and fuel-storage constraints remain downstream implementation checks."
            )
        if (
            original_building.dhw.enabled
            and original_building.dhw.system_type.value == "same_as_heating"
        ):
            warnings.append(
                "Generator design power in this optimizer uses the space-heating design load; "
                "DHW peak/storage sizing is checked at final equipment selection."
            )
    elif branch_id_override in SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES:
        profile = SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES[branch_id_override]
        assumptions.extend(
            [
                f"Technical heating branch: {profile['label']}.",
                (
                    "This branch is simulated with the LaCurent Light technology model "
                    "before any commercial product is selected."
                ),
                (
                    "No heating CAPEX is injected because a source-backed installed-cost "
                    "curve is not yet attached; this branch is technical-only and is "
                    "excluded from the economic winner."
                ),
            ]
        )
        warnings.append(str(profile["note"]))

    capex = sum(float(line.capex_lei) for line in lines)
    annual_bill = float(candidate.annual_bill_lei)
    saving = float(original_baseline_bill_lei) - annual_bill
    payback = capex / saving if capex > 0 and saving > 0 else None
    roi = 100.0 * saving / capex if capex > 0 else None

    data = model_to_dict(candidate)
    data.update(
        {
            "candidate_id": _stable_mixed_id(
                candidate.candidate_id,
                branch_id,
                None,
            ),
            "capex_lei": round(capex, 2),
            "baseline_annual_bill_lei": round(float(original_baseline_bill_lei), 2),
            "annual_saving_lei": round(saving, 2),
            "payback_years": None if payback is None else round(payback, 4),
            "roi_percent_per_year": None if roi is None else round(roi, 4),
            "cost_breakdown": [model_to_dict(line) for line in lines],
            "commercialization_status": (
                "raw_only"
                if capex <= 1e-9
                else "pending_product_catalog"
            ),
            "assumptions": assumptions,
            "warnings": warnings,
        }
    )
    return CandidateEvaluationV1(**data)

def _technology_id_from_candidate(
    candidate: CandidateEvaluationV1,
) -> str | None:
    building = candidate.resulting_configuration
    if building is None or building.heating.details is None:
        return None
    generator = building.heating.details.generator_type
    mapping = {
        HeatingGeneratorType.condensing_gas_boiler: "condensing-gas",
        HeatingGeneratorType.heat_pump_air_water: "heat-pump-air-water",
        HeatingGeneratorType.heat_pump_air_air: "heat-pump-air-air",
        HeatingGeneratorType.electric_boiler: "electric-boiler",
        HeatingGeneratorType.pellet_boiler: "pellet-boiler",
    }
    return mapping.get(generator)


def commercialize_heating_finalist(
    candidate: CandidateEvaluationV1,
    *,
    original_building: BuildingInput,
    heating_catalog: dict[str, Any] | None = None,
    branch_id: str | None = None,
) -> tuple[CandidateEvaluationV1, HeatingPlanningOptionV1 | None, list[str]]:
    """Match one raw economic finalist to a real generator and recalculate once.

    This is deliberately outside the raw search loop. The expensive
    manufacturer-specific performance check therefore runs at most for the
    finalist instead of once for every Halton/axis/refinement point.
    """

    if branch_id == "keep-current-heating":
        return candidate, None, [
            "Păstrează sistemul actual: finalistul nu necesită achiziția unui generator nou."
        ]
    catalog_technology_ids = {
        item.id for item in heating_technologies(heating_catalog)
    }
    if (
        branch_id in SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES
        and branch_id not in catalog_technology_ids
    ):
        return candidate, None, [
            (
                f"{SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES[branch_id]['label']}: "
                "ramură tehnică fără catalog comercial source-backed; nu se inventează un produs finalist."
            )
        ]

    technology_id = branch_id or _technology_id_from_candidate(candidate)
    if technology_id is None or candidate.resulting_configuration is None:
        return candidate, None, []

    technology = next(
        (
            item
            for item in heating_technologies(heating_catalog)
            if item.id == technology_id
        ),
        None,
    )
    if technology is None:
        return candidate, None, [
            f"{technology_id}: nu există încă un catalog comercial pentru discretizarea finalistului."
        ]

    required_power_kw = _required_generator_power_kw(candidate)
    if required_power_kw is None:
        return candidate, None, [
            f"{technology.label}: necesarul de putere nu este disponibil pentru selecția produsului."
        ]

    raw_building = candidate.resulting_configuration
    sized = _select_sized_product(
        raw_building,
        technology,
        required_power_kw,
    )
    if sized is None:
        return candidate, None, [
            (
                f"{technology.label}: niciun produs verificabil din catalog nu acoperă "
                f"necesarul final recalculat de {required_power_kw:.2f} kW la condiția "
                "de proiect a clădirii. Pentru pompele de căldură nu se extrapolează "
                "capacitatea dincolo de curba publicată."
            )
        ]
    product, available_design_capacity_kw, capacity_basis = sized
    building_data = model_to_dict(raw_building)
    product_heating = HeatingInput(
        system_type=product.system_type,
        carrier=product.carrier,
        efficiency=product.efficiency,
        scop=product.scop,
        details=HeatingSystemDetails(
            **_heating_details_for_product(raw_building, product)
        ),
        cost_profile=product.cost_profile,
    )
    building_data["heating"] = model_to_dict(product_heating)
    building_data["dhw"] = _dhw_for_product(raw_building, product)

    product_assumptions: list[str] = [
        (
            f"Generator sizing check: required {required_power_kw:.2f} kW; "
            f"available at design condition {available_design_capacity_kw:.2f} kW "
            f"using {capacity_basis}."
        )
    ]
    if "unverified" in capacity_basis or "unavailable" in capacity_basis or "missing" in capacity_basis:
        product_assumptions.append(
            "Generator capacity is not source-verified at the exact design operating point; "
            "catalog rated output is used only as a provisional fallback."
        )
    if product.generator_type in {
        HeatingGeneratorType.heat_pump_air_water,
        HeatingGeneratorType.heat_pump_air_air,
    }:
        estimated_scop, hp_assumptions = _estimated_heat_pump_scop(
            raw_building,
            product,
        )
        product_assumptions.extend(hp_assumptions)
        if estimated_scop is not None:
            building_data["heating"]["scop"] = float(estimated_scop)
        else:
            seasonal_scop, seasonal_basis = (
                _declared_seasonal_scop_for_building(
                    raw_building,
                    product,
                )
            )
            if seasonal_scop is not None:
                building_data["heating"]["scop"] = float(seasonal_scop)
                product_assumptions.append(
                    f"{product.label}: {seasonal_basis}; folosit deoarece curba COP "
                    "nu acoperă suficient profilul local fără extrapolare."
                )

    product_building = BuildingInput(**building_data)
    result = calculate(product_building, include_reference=False)
    priced = estimate_energy_cost(result)
    if not priced.get("complete"):
        return candidate, None, [
            f"{product.label}: factura anuală nu a putut fi evaluată după discretizare."
        ]

    lines = [
        line
        for line in candidate.cost_breakdown
        if line.family != "heating"
    ]
    lines.append(
        CostLineV1(
            family="heating",
            capex_lei=round(product.installed_capex_lei, 2),
            parameter_value=float(product.rated_power_kw),
            parameter_unit="kW_rated",
            source_kind=product.source_kind,
            source_url=product.source_url,
            confidence=product.confidence,
            catalog_unit="finalist_product_plus_installation_allowance",
            note=(
                f"{product.label}: produs real ales numai după optimizarea parametrică; "
                f"necesar final {required_power_kw:.2f} kW; capacitate disponibilă "
                f"la condiția de proiect {available_design_capacity_kw:.2f} kW "
                f"({capacity_basis}); putere nominală catalog "
                f"{product.rated_power_kw:.2f} kW. {product.note}"
            ),
            product_id=product.id,
            quantity=1,
            quantity_unit="system",
            material_subtotal_lei=round(float(product.equipment_price_lei), 2),
            nonmaterial_subtotal_lei=round(
                float(product.installation_allowance_lei),
                2,
            ),
            design_available_capacity_kw=round(
                float(available_design_capacity_kw),
                4,
            ),
            capacity_basis=capacity_basis,
        )
    )

    capex = sum(float(line.capex_lei) for line in lines)
    annual_bill = float(priced["priced_total_lei"])
    saving = float(candidate.baseline_annual_bill_lei) - annual_bill
    payback = capex / saving if capex > 0 and saving > 0 else None
    roi = 100.0 * saving / capex if capex > 0 else None
    all_active_exact = all(
        line.family == "heating" or line.product_id is not None
        for line in lines
        if line.capex_lei > 1e-9
    )

    data = model_to_dict(candidate)
    data.update(
        {
            "candidate_id": _stable_mixed_id(
                candidate.candidate_id,
                technology_id,
                product.id,
            ),
            "capex_lei": round(capex, 2),
            "annual_bill_lei": round(annual_bill, 2),
            "annual_saving_lei": round(saving, 2),
            "payback_years": None if payback is None else round(payback, 4),
            "roi_percent_per_year": None if roi is None else round(roi, 4),
            "final_energy_kwh": round(float(result.total_final_energy_kwh), 3),
            "primary_specific_kwh_m2": round(
                float(result.primary_energy.specific_kwh_m2),
                3,
            ),
            "co2_total_kg": round(float(result.co2.total_kg), 3),
            "co2_specific_kg_m2": round(
                float(result.co2.specific_kg_m2),
                3,
            ),
            "energy_class": result.energy_class,
            "resulting_configuration": model_to_dict(product_building),
            "cost_breakdown": [model_to_dict(line) for line in lines],
            "commercialization_status": (
                "commercialized"
                if all_active_exact
                else "partially_discretized"
            ),
            "assumptions": [
                *candidate.assumptions,
                *product_assumptions,
                (
                    "Heating product matching ran after raw economic selection and "
                    "the complete house was recalculated once with the selected SKU."
                ),
            ],
        }
    )
    return CandidateEvaluationV1(**data), product, product_assumptions


def _branch_request(
    request: OptimizationRequestV1,
    branch_baseline: BuildingInput,
) -> OptimizationRequestV1:
    kwargs: dict[str, Any] = {
        "baseline": branch_baseline,
        "mode": request.mode,
    }
    if request.mode == OptimizationMode.investment_budget:
        kwargs["investment_budget_lei"] = float(request.investment_budget_lei)
    elif request.mode == OptimizationMode.annual_bill_target:
        kwargs["annual_bill_target_lei"] = float(request.annual_bill_target_lei)
    elif request.mode == OptimizationMode.max_payback_years:
        kwargs["max_payback_years"] = float(request.max_payback_years)
    return OptimizationRequestV1(**kwargs)


def heating_branch_plan(
    request: OptimizationRequestV1,
    heating_catalog: dict[str, Any] | None = None,
) -> list[HeatingBranchSummaryV1]:
    plan: list[HeatingBranchSummaryV1] = [
        HeatingBranchSummaryV1(
            branch_id="keep-current-heating",
            label="Păstrează sistemul actual",
            fixed_capex_lei=0.0,
            eligible=True,
            economic_eligible=True,
            commercialization_mode="existing_system",
            sizing_mode="existing_system",
        )
    ]

    for technology in heating_technologies(heating_catalog):
        eligible, reason = technology_is_eligible(request.baseline, technology)
        plan.append(
            HeatingBranchSummaryV1(
                branch_id=technology.id,
                label=technology.label,
                fixed_capex_lei=round(technology.minimum_capex_lei, 2),
                eligible=eligible,
                economic_eligible=True,
                commercialization_mode="raw_parametric_then_product_match",
                min_product_power_kw=technology.min_power_kw,
                max_product_power_kw=technology.max_power_kw,
                sizing_mode="raw_design_load_then_product_match_finalists",
                note=reason,
            )
        )

    existing_ids = {item.branch_id for item in plan}
    for branch_id, profile in SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES.items():
        if branch_id in existing_ids:
            continue
        eligible, reason = _supplemental_branch_eligible(request.baseline, branch_id)
        note_parts = [value for value in (reason, profile.get("note")) if value]
        plan.append(
            HeatingBranchSummaryV1(
                branch_id=branch_id,
                label=str(profile["label"]),
                fixed_capex_lei=0.0,
                eligible=eligible,
                economic_eligible=False,
                commercialization_mode="technical_only_pending_cost_catalog",
                min_product_power_kw=None,
                max_product_power_kw=None,
                sizing_mode="technical_design_load_without_sku",
                note=" ".join(str(value) for value in note_parts) or None,
            )
        )
    return plan

def run_heating_branch_optimization(
    request: OptimizationRequestV1,
    *,
    branch_id: str,
    bounds: OptimizationSearchBoundsV1,
    catalog: dict[str, Any],
    max_evaluations: int = 24,
    search_phase: Literal["full", "axis", "halton", "refine"] = "full",
    refinement_seed: Any | None = None,
    phase_candidate_offset: int = 0,
    heating_catalog: dict[str, Any] | None = None,
) -> HeatingBranchRunResultV1:
    baseline_result, baseline_cost = cached_baseline_evaluation(
        request.baseline
    )
    if not baseline_cost.get("complete"):
        raise ValueError(
            "Baseline annual bill is incomplete; branch optimization cannot run safely."
        )
    original_baseline_bill = float(baseline_cost["priced_total_lei"])

    technology: HeatingTechnologyV2 | None = None
    branch_baseline = request.baseline
    label = "Păstrează sistemul actual"
    min_capex = 0.0
    min_power = None
    max_power = None
    sizing_mode = "existing_system"
    economic_eligible = True
    commercialization_mode = "existing_system"
    branch_id_override: str | None = None
    technical_note: str | None = None

    if branch_id != "keep-current-heating":
        technology = next(
            (
                item
                for item in heating_technologies(heating_catalog)
                if item.id == branch_id
            ),
            None,
        )

        if technology is not None:
            eligible, reason = technology_is_eligible(request.baseline, technology)
            if not eligible:
                summary = HeatingBranchSummaryV1(
                    branch_id=branch_id,
                    label=technology.label,
                    fixed_capex_lei=round(technology.minimum_capex_lei, 2),
                    eligible=False,
                    economic_eligible=True,
                    commercialization_mode="raw_parametric_then_product_match",
                    min_product_power_kw=technology.min_power_kw,
                    max_product_power_kw=technology.max_power_kw,
                    sizing_mode="raw_design_load_then_product_match_finalists",
                    note=reason,
                )
                return HeatingBranchRunResultV1(
                    selection=select_optimization_candidate(request, []),
                    branch=summary,
                    candidates=[],
                    candidate_count=0,
                    parametric_evaluations=0,
                    search_phase=search_phase,
                    warnings=[],
                )
            branch_baseline = apply_heating_technology(
                request.baseline,
                technology,
            )
            label = technology.label
            min_capex = technology.minimum_capex_lei
            min_power = technology.min_power_kw
            max_power = technology.max_power_kw
            sizing_mode = "raw_design_load_then_product_match_finalists"
            commercialization_mode = "raw_parametric_then_product_match"
        else:
            profile = SUPPLEMENTAL_TECHNICAL_HEATING_BRANCHES.get(branch_id)
            if profile is None:
                raise ValueError(
                    f"Unknown heating technology branch {branch_id!r}."
                )
            eligible, reason = _supplemental_branch_eligible(
                request.baseline,
                branch_id,
            )
            if not eligible:
                summary = HeatingBranchSummaryV1(
                    branch_id=branch_id,
                    label=str(profile["label"]),
                    fixed_capex_lei=0.0,
                    eligible=False,
                    economic_eligible=False,
                    commercialization_mode="technical_only_pending_cost_catalog",
                    min_product_power_kw=None,
                    max_product_power_kw=None,
                    sizing_mode="technical_design_load_without_sku",
                    note=reason or str(profile.get("note") or ""),
                )
                return HeatingBranchRunResultV1(
                    selection=select_optimization_candidate(request, []),
                    branch=summary,
                    candidates=[],
                    candidate_count=0,
                    parametric_evaluations=0,
                    search_phase=search_phase,
                    warnings=[],
                )
            branch_baseline = apply_supplemental_heating_technology(
                request.baseline,
                branch_id,
            )
            label = str(profile["label"])
            economic_eligible = False
            commercialization_mode = "technical_only_pending_cost_catalog"
            sizing_mode = "technical_design_load_without_sku"
            branch_id_override = branch_id
            technical_note = str(profile.get("note") or "")

    branch_request = _branch_request(request, branch_baseline)

    def postprocess(item: CandidateEvaluationV1) -> CandidateEvaluationV1 | None:
        return _rebase_candidate(
            item,
            original_baseline_bill_lei=original_baseline_bill,
            original_building=request.baseline,
            technology=technology,
            branch_id_override=branch_id_override,
        )

    search = run_parametric_optimization(
        OptimizationSearchRequestV1(
            request=branch_request,
            bounds=bounds,
            max_evaluations=max_evaluations,
        ),
        catalog,
        candidate_postprocessor=postprocess,
        search_phase=search_phase,
        refinement_seed=refinement_seed,
        phase_candidate_offset=phase_candidate_offset,
    )

    rejected_capacity = max(
        int(search.engine_evaluations) - len(search.candidates),
        0,
    )
    selection = select_optimization_candidate(request, search.candidates)
    summary = HeatingBranchSummaryV1(
        branch_id=branch_id,
        label=label,
        fixed_capex_lei=round(min_capex, 2),
        eligible=True,
        economic_eligible=economic_eligible,
        commercialization_mode=commercialization_mode,
        evaluated_candidates=int(search.engine_evaluations),
        accepted_candidates=len(search.candidates),
        rejected_for_capacity=rejected_capacity,
        feasible_candidates=(
            int(selection.feasible_count)
            if economic_eligible
            else 0
        ),
        min_product_power_kw=min_power,
        max_product_power_kw=max_power,
        sizing_mode=sizing_mode,
        note=technical_note,
    )
    warnings = list(search.warnings)
    if technology is not None:
        warnings.extend(
            [
                (
                    "Puterea necesară a generatorului este recalculată pentru fiecare "
                    "candidat după recalcularea completă a casei."
                ),
                (
                    "Optimizerul folosește o curbă CAPEX parametrică derivată din "
                    "observațiile catalogului; produsul real nu este selectat în bucla "
                    "de căutare."
                ),
                (
                    "Discretizarea la SKU și verificarea curbelor producătorului sunt "
                    "amânate până după alegerea finalistului."
                ),
            ]
        )
    elif branch_id_override is not None:
        warnings.append(
            technical_note
            or "Ramură tehnică fără cost comercial source-backed; exclusă din câștigătorul economic."
        )

    return HeatingBranchRunResultV1(
        selection=selection,
        branch=summary,
        candidates=search.candidates,
        candidate_count=len(search.candidates),
        parametric_evaluations=int(search.engine_evaluations),
        search_phase=search_phase,
        warnings=warnings,
    )

def run_mixed_heating_optimization(
    request: OptimizationRequestV1,
    *,
    bounds: OptimizationSearchBoundsV1,
    catalog: dict[str, Any],
    max_evaluations_per_branch: int = 48,
    heating_catalog: dict[str, Any] | None = None,
) -> MixedHeatingOptimizationResultV1:
    all_candidates: list[CandidateEvaluationV1] = []
    summaries: list[HeatingBranchSummaryV1] = []
    total_parametric = 0
    heating_branch_evaluations = 0
    warnings: list[str] = []

    for branch in heating_branch_plan(request, heating_catalog):
        if not branch.eligible:
            summaries.append(branch)
            continue
        result = run_heating_branch_optimization(
            request,
            branch_id=branch.branch_id,
            bounds=bounds,
            catalog=catalog,
            max_evaluations=max_evaluations_per_branch,
            heating_catalog=heating_catalog,
        )
        summaries.append(result.branch)
        total_parametric += int(result.parametric_evaluations)
        if branch.branch_id != "keep-current-heating":
            heating_branch_evaluations += int(result.parametric_evaluations)
        if branch.economic_eligible and result.selection.selected is not None:
            all_candidates.extend(
                candidate
                for candidate in [result.selection.selected]
                if candidate is not None
            )
        warnings.extend(result.warnings)

    selection = select_optimization_candidate(request, all_candidates)
    return MixedHeatingOptimizationResultV1(
        selection=selection,
        candidates=all_candidates,
        parametric_evaluations=total_parametric,
        heating_branch_evaluations=heating_branch_evaluations,
        branches=summaries,
        warnings=[
            "Mixed heating V4 evaluates technology branches before commercial product matching.",
            "The complete building is recalculated once for each raw optimizer candidate before generator design power is derived.",
            "Product-backed branches use a continuous planning CAPEX curve in required-kW space; no SKU is selected inside the raw search loop.",
            "Air-air and ground-source heat pumps may run as technical-only branches until source-backed installed-cost/product catalogs are attached.",
            "Heat-pump product capacity/COP curves remain finalist verification at the normative winter design temperature.",
            "DHW peak/storage sizing is not yet added to the generator design load.",
            *warnings,
        ],
    )
