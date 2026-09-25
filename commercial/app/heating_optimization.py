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
    note: str = ""

    @property
    def installed_capex_lei(self) -> float:
        return float(self.equipment_price_lei) + float(self.installation_allowance_lei)


class HeatingBranchSummaryV1(BaseModel):
    branch_id: str
    label: str
    fixed_capex_lei: float
    eligible: bool
    evaluated_candidates: int = 0
    accepted_candidates: int = 0
    rejected_for_capacity: int = 0
    note: str | None = None


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


def _same_generator_family(building: BuildingInput, option: HeatingPlanningOptionV1) -> bool:
    details = building.heating.details
    if details is not None and details.generator_type is not None:
        return details.generator_type == option.generator_type
    if option.system_type == HeatingSystemType.heat_pump:
        return building.heating.system_type == HeatingSystemType.heat_pump
    if option.system_type == HeatingSystemType.condensing_gas_boiler:
        return building.heating.system_type == HeatingSystemType.condensing_gas_boiler
    return False


def option_is_eligible(building: BuildingInput, option: HeatingPlanningOptionV1) -> tuple[bool, str | None]:
    if option.requires_hydronic and not _is_hydronic(building):
        return False, "Sistemul necesită o instalație hidronică existentă; conversia emitatoarelor nu este inclusă."
    if option.requires_existing_gas and not _has_existing_gas(building):
        return False, "Gazul nu este confirmat ca disponibil în configurația casei."
    if _same_generator_family(building, option):
        return False, "Aceeași familie de generator este deja instalată; păstrarea sistemului actual este evaluată separat cu CAPEX zero."
    return True, None


def _heating_details_for_option(
    building: BuildingInput,
    option: HeatingPlanningOptionV1,
) -> dict[str, Any]:
    current = _default_details(building)
    data = model_to_dict(current)
    data["generator_type"] = option.generator_type.value
    # Auxiliaries depend on the new generator; let Light Engine use its
    # generator-specific default instead of carrying the old pump/fan value.
    data["auxiliary_electricity_kwh_year"] = None
    return data


def _dhw_for_option(building: BuildingInput, option: HeatingPlanningOptionV1) -> dict[str, Any]:
    dhw = model_to_dict(building.dhw)
    if not dhw.get("enabled") or dhw.get("system_type") != "same_as_heating":
        return dhw

    defaults = methodology()["dhw"]["system_defaults"]
    if option.system_type == HeatingSystemType.heat_pump:
        cfg = defaults["heat_pump_water_heater"]
        dhw["cop"] = float(cfg["cop"])
        dhw["efficiency"] = None
        dhw["carrier"] = "electricity"
    elif option.generator_type == HeatingGeneratorType.electric_boiler:
        cfg = defaults["electric_boiler"]
        dhw["cop"] = None
        dhw["efficiency"] = float(cfg["efficiency"])
        dhw["carrier"] = "electricity"
    elif option.system_type == HeatingSystemType.condensing_gas_boiler:
        cfg = defaults["gas_boiler"]
        dhw["cop"] = None
        dhw["efficiency"] = float(cfg["efficiency"])
        dhw["carrier"] = "natural_gas"
    else:
        dhw["cop"] = None
        dhw["efficiency"] = float(option.efficiency or 0.88)
        dhw["carrier"] = option.carrier.value
    return dhw


def apply_heating_option(
    building: BuildingInput,
    option: HeatingPlanningOptionV1,
) -> BuildingInput:
    payload = model_to_dict(building)
    payload["heating"] = model_to_dict(
        HeatingInput(
            system_type=option.system_type,
            carrier=option.carrier,
            efficiency=option.efficiency,
            scop=option.scop,
            details=HeatingSystemDetails(**_heating_details_for_option(building, option)),
            cost_profile=option.cost_profile,
        )
    )
    payload["dhw"] = _dhw_for_option(building, option)
    return BuildingInput(**payload)


def _stable_mixed_id(candidate_id: str, branch_id: str) -> str:
    raw = f"{branch_id}:{candidate_id}".encode("utf-8")
    return "OPT-MIX-" + hashlib.sha256(raw).hexdigest()[:12].upper()


def _rebase_candidate(
    candidate: CandidateEvaluationV1,
    *,
    original_baseline_bill_lei: float,
    option: HeatingPlanningOptionV1 | None,
) -> CandidateEvaluationV1:
    lines = list(candidate.cost_breakdown)
    fixed_capex = 0.0
    assumptions = list(candidate.assumptions)
    warnings = list(candidate.warnings)
    branch_id = "keep-current-heating"

    if option is not None:
        branch_id = option.id
        fixed_capex = option.installed_capex_lei
        lines = [line for line in lines if line.family != "heating"]
        lines.append(
            CostLineV1(
                family="heating",
                capex_lei=round(fixed_capex, 2),
                parameter_value=float(option.rated_power_kw),
                parameter_unit="kW_rated",
                source_kind=option.source_kind,
                source_url=option.source_url,
                confidence=option.confidence,
                catalog_unit="equipment_plus_planning_installation_allowance",
                note=f"{option.label}. {option.note}",
                product_id=option.id,
                quantity=1,
                quantity_unit="system",
                material_subtotal_lei=round(float(option.equipment_price_lei), 2),
                nonmaterial_subtotal_lei=round(float(option.installation_allowance_lei), 2),
            )
        )
        assumptions.extend(
            [
                f"Heating branch: {option.label}.",
                "Heating CAPEX is a planning reference, not a contractor quote.",
                "Existing emitters/distribution are preserved; conversion of emitters is not silently assumed.",
            ]
        )
        if option.generator_type == HeatingGeneratorType.electric_boiler:
            warnings.append(
                "Centrala electrică poate necesita alimentare trifazată sau upgrade de branșament; fezabilitatea electrică trebuie confirmată."
            )
        if option.generator_type == HeatingGeneratorType.pellet_boiler:
            warnings.append(
                "Centrala pe peleți necesită validarea coșului, spațiului tehnic și depozitării combustibilului."
            )

    capex = sum(float(line.capex_lei) for line in lines)
    annual_bill = float(candidate.annual_bill_lei)
    saving = float(original_baseline_bill_lei) - annual_bill
    payback = capex / saving if capex > 0 and saving > 0 else None
    roi = 100.0 * saving / capex if capex > 0 else None

    data = model_to_dict(candidate)
    data.update(
        {
            "candidate_id": _stable_mixed_id(candidate.candidate_id, branch_id),
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


def _neutral_branch_request(
    request: OptimizationRequestV1,
    branch_baseline: BuildingInput,
    *,
    fixed_capex_lei: float,
) -> OptimizationRequestV1 | None:
    # Search generation is mostly objective-neutral. Preserve target modes where
    # their ordering within one fixed-heating branch remains valid. Budget needs
    # the branch CAPEX removed up front. Payback is generated under the automatic
    # policy because fixed CAPEX and baseline shifts otherwise distort local
    # refinement; the true payback constraint is applied globally afterwards.
    if request.mode == OptimizationMode.investment_budget:
        remaining = float(request.investment_budget_lei) - fixed_capex_lei
        if remaining < -1e-6:
            return None
        return OptimizationRequestV1(
            baseline=branch_baseline,
            mode=OptimizationMode.investment_budget,
            investment_budget_lei=max(0.0, remaining),
        )
    if request.mode == OptimizationMode.annual_bill_target:
        return OptimizationRequestV1(
            baseline=branch_baseline,
            mode=OptimizationMode.annual_bill_target,
            annual_bill_target_lei=float(request.annual_bill_target_lei),
        )
    if request.mode == OptimizationMode.max_payback_years:
        return OptimizationRequestV1(
            baseline=branch_baseline,
            mode=OptimizationMode.auto_economic,
        )
    return OptimizationRequestV1(
        baseline=branch_baseline,
        mode=OptimizationMode.auto_economic,
    )


def run_mixed_heating_optimization(
    request: OptimizationRequestV1,
    *,
    bounds: OptimizationSearchBoundsV1,
    catalog: dict[str, Any],
    max_evaluations_per_branch: int = 48,
) -> MixedHeatingOptimizationResultV1:
    baseline_result = calculate(request.baseline, include_reference=False)
    baseline_cost = estimate_energy_cost(baseline_result)
    if not baseline_cost.get("complete"):
        raise ValueError("Baseline annual bill is incomplete; mixed optimization cannot run safely.")
    original_baseline_bill = float(baseline_cost["priced_total_lei"])

    branches: list[tuple[str, str, HeatingPlanningOptionV1 | None, BuildingInput, str | None]] = [
        (
            "keep-current-heating",
            "Păstrează sistemul actual",
            None,
            request.baseline,
            None,
        )
    ]
    summaries: list[HeatingBranchSummaryV1] = []
    for option in heating_planning_options():
        eligible, reason = option_is_eligible(request.baseline, option)
        if eligible:
            branches.append(
                (
                    option.id,
                    option.label,
                    option,
                    apply_heating_option(request.baseline, option),
                    None,
                )
            )
        else:
            summaries.append(
                HeatingBranchSummaryV1(
                    branch_id=option.id,
                    label=option.label,
                    fixed_capex_lei=option.installed_capex_lei,
                    eligible=False,
                    note=reason,
                )
            )

    all_candidates: list[CandidateEvaluationV1] = []
    total_parametric = 0
    heating_branch_evaluations = 0

    for branch_id, label, option, branch_baseline, note in branches:
        fixed_capex = 0.0 if option is None else option.installed_capex_lei
        branch_request = _neutral_branch_request(
            request,
            branch_baseline,
            fixed_capex_lei=fixed_capex,
        )
        if branch_request is None:
            summaries.append(
                HeatingBranchSummaryV1(
                    branch_id=branch_id,
                    label=label,
                    fixed_capex_lei=fixed_capex,
                    eligible=False,
                    note="CAPEX-ul fix al sistemului depășește singur bugetul de investiție.",
                )
            )
            continue

        search = run_parametric_optimization(
            OptimizationSearchRequestV1(
                request=branch_request,
                bounds=bounds,
                max_evaluations=max_evaluations_per_branch,
            ),
            catalog,
        )
        total_parametric += int(search.evaluated_candidates)
        if option is not None:
            heating_branch_evaluations += int(search.evaluated_candidates)

        accepted = 0
        rejected_capacity = 0
        for raw_candidate in search.candidates:
            mixed = _rebase_candidate(
                raw_candidate,
                original_baseline_bill_lei=original_baseline_bill,
                option=option,
            )
            if (
                option is not None
                and mixed.design_heat_load_kw is not None
                and float(option.rated_power_kw) + 1e-9 < float(mixed.design_heat_load_kw)
            ):
                rejected_capacity += 1
                continue
            all_candidates.append(mixed)
            accepted += 1

        summaries.append(
            HeatingBranchSummaryV1(
                branch_id=branch_id,
                label=label,
                fixed_capex_lei=fixed_capex,
                eligible=True,
                evaluated_candidates=int(search.evaluated_candidates),
                accepted_candidates=accepted,
                rejected_for_capacity=rejected_capacity,
                note=note,
            )
        )

    selection = select_optimization_candidate(request, all_candidates)
    return MixedHeatingOptimizationResultV1(
        selection=selection,
        candidates=all_candidates,
        parametric_evaluations=total_parametric,
        heating_branch_evaluations=heating_branch_evaluations,
        branches=summaries,
        warnings=[
            "Mixed heating V2 searches continuous envelope/renewables separately inside each eligible heating branch.",
            "Heating options are planning technologies with source-backed equipment references plus explicit installation allowances; they are not final contractor quotes.",
            "Existing emitters and distribution are preserved. A separate emitter-conversion model is required before recommending incompatible system topologies.",
            "The final selected solution is still pending product-level commercial discretization for envelope, windows, PV and solar thermal.",
        ],
    )
