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


class HeatingTechnologyV2(BaseModel):
    id: str
    label: str
    products: list[HeatingPlanningOptionV1]

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
    grouped: dict[str, list[HeatingPlanningOptionV1]] = {}
    for item in heating_planning_options(catalog):
        grouped.setdefault(item.technology_id, []).append(item)
    return [
        HeatingTechnologyV2(
            id=technology_id,
            label=items[0].technology_label,
            products=sorted(items, key=lambda item: (item.rated_power_kw, item.installed_capex_lei)),
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
    if generator == HeatingGeneratorType.heat_pump_air_water:
        return building.heating.system_type == HeatingSystemType.heat_pump
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
    return data


def _dhw_for_product(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> dict[str, Any]:
    dhw = model_to_dict(building.dhw)
    if not dhw.get("enabled") or dhw.get("system_type") != "same_as_heating":
        return dhw

    defaults = methodology()["dhw"]["system_defaults"]
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


def _select_sized_product(
    building: BuildingInput,
    technology: HeatingTechnologyV2,
    required_power_kw: float,
) -> HeatingPlanningOptionV1 | None:
    products = [
        product
        for product in technology.products
        if _product_infrastructure_eligible(building, product)
        and float(product.rated_power_kw) + 1e-9 >= float(required_power_kw)
    ]
    if not products:
        return None
    return min(
        products,
        key=lambda item: (
            float(item.rated_power_kw),
            float(item.installed_capex_lei),
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


def _estimated_heat_pump_scop(
    building: BuildingInput,
    product: HeatingPlanningOptionV1,
) -> tuple[float | None, list[str]]:
    if product.generator_type != HeatingGeneratorType.heat_pump_air_water:
        return None, []
    if not product.performance_points:
        return None, [
            f"{product.label}: nu există încă puncte COP A/W verificate; se păstrează fallback-ul Light Engine."
        ]

    climate = resolve_climate(building.locality)
    design_outdoor = climate.get("winter_design_temperature_c")
    months = climate.get("monthly_temperatures") or []
    if design_outdoor is None or not months:
        return None, [
            f"{product.label}: profilul climatic nu permite calculul COP sezonier specific produsului."
        ]

    total_heat_weight = 0.0
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
        flow_c, _ = _weather_compensated_flow_temperature_c(
            building,
            outdoor_temperature_c=outdoor,
            winter_design_temperature_c=float(design_outdoor),
        )
        cop = _interpolate_heat_pump_metric(
            product.performance_points,
            outdoor_temperature_c=outdoor,
            flow_temperature_c=flow_c,
            metric="cop",
        )
        if cop is None or cop <= 1.0:
            continue
        total_heat_weight += load_weight
        total_electric_weight += load_weight / cop
        used_points += 1

    if used_points < 3 or total_electric_weight <= 0:
        return None, [
            f"{product.label}: curba COP nu acoperă suficient regimul climatic și temperatura de tur ale casei; fallback Light Engine."
        ]

    scop = total_heat_weight / total_electric_weight
    return round(scop, 4), [
        (
            f"{product.label}: SCOP LaCurent estimat {scop:.2f} din punctele COP ale "
            "producătorului, clima locală și curba climatică tur/retur a instalației."
        )
    ]


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

    by_power: dict[float, float] = {}
    for product in eligible_products:
        power = float(product.rated_power_kw)
        capex = float(product.installed_capex_lei)
        previous = by_power.get(power)
        if previous is None or capex < previous:
            by_power[power] = capex

    points = sorted(by_power.items())
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
        fraction = (target - float(lower_power)) / span
        interpolated = float(lower_cost) + fraction * (
            float(upper_cost) - float(lower_cost)
        )
    return round(interpolated, 2), min_power, max_power, len(points)


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
        HeatingGeneratorType.electric_boiler: "electric-boiler",
        HeatingGeneratorType.pellet_boiler: "pellet-boiler",
    }
    return mapping.get(generator)


def commercialize_heating_finalist(
    candidate: CandidateEvaluationV1,
    *,
    original_building: BuildingInput,
    heating_catalog: dict[str, Any] | None = None,
) -> tuple[CandidateEvaluationV1, HeatingPlanningOptionV1 | None, list[str]]:
    """Match one raw economic finalist to a real generator and recalculate once.

    This is deliberately outside the raw search loop. The expensive
    manufacturer-specific performance check therefore runs at most for the
    finalist instead of once for every Halton/axis/refinement point.
    """

    technology_id = _technology_id_from_candidate(candidate)
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
    product = _select_sized_product(
        original_building,
        technology,
        required_power_kw,
    )
    if product is None:
        return candidate, None, [
            (
                f"{technology.label}: niciun produs din catalog nu acoperă necesarul "
                f"final recalculat de {required_power_kw:.2f} kW."
            )
        ]

    raw_building = candidate.resulting_configuration
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

    product_assumptions: list[str] = []
    if product.generator_type == HeatingGeneratorType.heat_pump_air_water:
        estimated_scop, hp_assumptions = _estimated_heat_pump_scop(
            raw_building,
            product,
        )
        product_assumptions.extend(hp_assumptions)
        if estimated_scop is not None:
            building_data["heating"]["scop"] = float(estimated_scop)

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
                f"necesar final {required_power_kw:.2f} kW → treaptă comercială "
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
    baseline_result = calculate(request.baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
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
