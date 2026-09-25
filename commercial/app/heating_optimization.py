from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from .engine import calculate
from .methodology import methodology
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


class HeatingPlanningOptionV1(BaseModel):
    technology_id: str
    technology_label: str
    id: str
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


def heating_planning_options() -> list[HeatingPlanningOptionV1]:
    raw = heating_planning_catalog()
    return [HeatingPlanningOptionV1(**item) for item in raw.get("options", [])]


def heating_technologies() -> list[HeatingTechnologyV2]:
    grouped: dict[str, list[HeatingPlanningOptionV1]] = {}
    for item in heating_planning_options():
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


def _stable_mixed_id(
    candidate_id: str,
    branch_id: str,
    product_id: str | None = None,
) -> str:
    raw = f"{branch_id}:{product_id or 'existing'}:{candidate_id}".encode("utf-8")
    return "OPT-MIX-" + hashlib.sha256(raw).hexdigest()[:12].upper()


def _rebase_candidate(
    candidate: CandidateEvaluationV1,
    *,
    original_baseline_bill_lei: float,
    original_building: BuildingInput,
    technology: HeatingTechnologyV2 | None,
) -> CandidateEvaluationV1 | None:
    lines = [line for line in candidate.cost_breakdown if line.family != "heating"]
    assumptions = list(candidate.assumptions)
    warnings = list(candidate.warnings)
    branch_id = "keep-current-heating"
    product: HeatingPlanningOptionV1 | None = None
    required_power_kw = _required_generator_power_kw(candidate)

    if technology is not None:
        branch_id = technology.id
        if required_power_kw is None:
            return None
        product = _select_sized_product(
            original_building,
            technology,
            required_power_kw,
        )
        if product is None:
            return None

        oversize_kw = max(float(product.rated_power_kw) - required_power_kw, 0.0)
        oversize_pct = (
            100.0 * oversize_kw / required_power_kw
            if required_power_kw > 1e-9
            else 0.0
        )
        lines.append(
            CostLineV1(
                family="heating",
                capex_lei=round(product.installed_capex_lei, 2),
                parameter_value=float(product.rated_power_kw),
                parameter_unit="kW_rated",
                source_kind=product.source_kind,
                source_url=product.source_url,
                confidence=product.confidence,
                catalog_unit="sized_equipment_plus_planning_installation_allowance",
                note=(
                    f"{technology.label}: necesar recalculat {required_power_kw:.2f} kW; "
                    f"treaptă comercială selectată {product.rated_power_kw:.2f} kW "
                    f"(+{oversize_kw:.2f} kW / {oversize_pct:.1f}% peste necesarul de calcul). "
                    f"{product.note}"
                ),
                product_id=product.id,
                quantity=1,
                quantity_unit="system",
                material_subtotal_lei=round(float(product.equipment_price_lei), 2),
                nonmaterial_subtotal_lei=round(float(product.installation_allowance_lei), 2),
            )
        )
        assumptions.extend(
            [
                f"Heating technology branch: {technology.label}.",
                (
                    f"Generator sizing is recalculated for this candidate from the "
                    f"design heat load: {required_power_kw:.2f} kW."
                ),
                "No arbitrary fixed oversizing factor is applied.",
                (
                    f"Commercial sizing rounds upward to {product.rated_power_kw:.2f} kW "
                    f"using the current planning catalog."
                ),
                "Existing emitters/distribution are preserved; conversion of emitters is not silently assumed.",
            ]
        )
        if product.capacity_basis == "catalog_nominal_output" and product.generator_type == HeatingGeneratorType.heat_pump_air_water:
            warnings.append(
                "Puterea pompei de căldură este momentan puterea nominală de catalog; "
                "capacitatea disponibilă la temperatura exterioară de calcul trebuie "
                "validată pe curba producătorului înainte de recomandarea finală."
            )
        if product.generator_type == HeatingGeneratorType.condensing_gas_boiler:
            warnings.append(
                "La centrala pe gaz trebuie verificată și puterea minimă de modulare; "
                "optimizerul dimensionează momentan după puterea maximă necesară."
            )
        if product.generator_type == HeatingGeneratorType.electric_boiler and product.requires_existing_high_power_electric:
            warnings.append(
                "Treapta electrică selectată necesită validarea branșamentului, protecțiilor și puterii aprobate."
            )
        if product.generator_type == HeatingGeneratorType.pellet_boiler:
            warnings.append(
                "Centrala pe peleți necesită validarea coșului, spațiului tehnic și depozitării combustibilului."
            )
        if original_building.dhw.enabled and original_building.dhw.system_type.value == "same_as_heating":
            warnings.append(
                "Dimensionarea generatorului din această versiune folosește sarcina de încălzire a spațiilor; "
                "puterea de vârf pentru ACM / strategia de acumulare trebuie verificată separat la discretizarea finală."
            )

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
                product.id if product else None,
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
) -> list[HeatingBranchSummaryV1]:
    plan: list[HeatingBranchSummaryV1] = [
        HeatingBranchSummaryV1(
            branch_id="keep-current-heating",
            label="Păstrează sistemul actual",
            fixed_capex_lei=0.0,
            eligible=True,
            sizing_mode="existing_system",
        )
    ]
    for technology in heating_technologies():
        eligible, reason = technology_is_eligible(request.baseline, technology)
        if (
            eligible
            and request.mode == OptimizationMode.investment_budget
            and technology.minimum_capex_lei > float(request.investment_budget_lei) + 1e-6
        ):
            eligible = False
            reason = "CAPEX-ul minim al tehnologiei depășește singur bugetul de investiție."
        plan.append(
            HeatingBranchSummaryV1(
                branch_id=technology.id,
                label=technology.label,
                fixed_capex_lei=round(technology.minimum_capex_lei, 2),
                eligible=eligible,
                min_product_power_kw=technology.min_power_kw,
                max_product_power_kw=technology.max_power_kw,
                sizing_mode="design_load_recalculated_per_candidate",
                note=reason,
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
) -> HeatingBranchRunResultV1:
    baseline_result = calculate(request.baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
    if not baseline_cost.get("complete"):
        raise ValueError("Baseline annual bill is incomplete; branch optimization cannot run safely.")
    original_baseline_bill = float(baseline_cost["priced_total_lei"])

    technology: HeatingTechnologyV2 | None = None
    branch_baseline = request.baseline
    label = "Păstrează sistemul actual"
    min_capex = 0.0
    min_power = None
    max_power = None
    sizing_mode = "existing_system"

    if branch_id != "keep-current-heating":
        technology = next(
            (item for item in heating_technologies() if item.id == branch_id),
            None,
        )
        if technology is None:
            raise ValueError(f"Unknown heating technology branch {branch_id!r}.")
        eligible, reason = technology_is_eligible(request.baseline, technology)
        if not eligible:
            summary = HeatingBranchSummaryV1(
                branch_id=branch_id,
                label=technology.label,
                fixed_capex_lei=round(technology.minimum_capex_lei, 2),
                eligible=False,
                min_product_power_kw=technology.min_power_kw,
                max_product_power_kw=technology.max_power_kw,
                sizing_mode="design_load_recalculated_per_candidate",
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
        branch_baseline = apply_heating_technology(request.baseline, technology)
        label = technology.label
        min_capex = technology.minimum_capex_lei
        min_power = technology.min_power_kw
        max_power = technology.max_power_kw
        sizing_mode = "design_load_recalculated_per_candidate"

    branch_request = _branch_request(request, branch_baseline)

    def postprocess(item: CandidateEvaluationV1) -> CandidateEvaluationV1 | None:
        return _rebase_candidate(
            item,
            original_baseline_bill_lei=original_baseline_bill,
            original_building=request.baseline,
            technology=technology,
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
    )

    rejected_capacity = max(int(search.engine_evaluations) - len(search.candidates), 0)
    selection = select_optimization_candidate(request, search.candidates)
    summary = HeatingBranchSummaryV1(
        branch_id=branch_id,
        label=label,
        fixed_capex_lei=round(min_capex, 2),
        eligible=True,
        evaluated_candidates=int(search.engine_evaluations),
        accepted_candidates=len(search.candidates),
        rejected_for_capacity=rejected_capacity,
        feasible_candidates=int(selection.feasible_count),
        min_product_power_kw=min_power,
        max_product_power_kw=max_power,
        sizing_mode=sizing_mode,
    )
    warnings = list(search.warnings)
    if technology is not None:
        warnings.extend(
            [
                "Puterea generatorului este recalculată pentru fiecare candidat după recalcularea completă a casei.",
                "Nu se aplică un procent universal de supradimensionare; treapta comercială este aleasă imediat peste necesarul de calcul.",
            ]
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
) -> MixedHeatingOptimizationResultV1:
    all_candidates: list[CandidateEvaluationV1] = []
    summaries: list[HeatingBranchSummaryV1] = []
    total_parametric = 0
    heating_branch_evaluations = 0
    warnings: list[str] = []

    for branch in heating_branch_plan(request):
        if not branch.eligible:
            summaries.append(branch)
            continue
        result = run_heating_branch_optimization(
            request,
            branch_id=branch.branch_id,
            bounds=bounds,
            catalog=catalog,
            max_evaluations=max_evaluations_per_branch,
        )
        summaries.append(result.branch)
        total_parametric += int(result.parametric_evaluations)
        if branch.branch_id != "keep-current-heating":
            heating_branch_evaluations += int(result.parametric_evaluations)
        if result.selection.selected is not None:
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
            "Mixed heating V3 treats heating technology as discrete and generator capacity as candidate-dependent.",
            "The full building is recalculated before generator sizing for every optimizer evaluation.",
            "Commercial generator size is rounded upward from the recalculated design heat load; no universal oversizing percentage is injected.",
            "Heat-pump nominal capacity still requires manufacturer-curve verification at the normative winter design temperature.",
            "DHW peak/storage sizing is not yet added to the generator design load.",
            *warnings,
        ],
    )
