"""Currently supported Chapter 4 photovoltaic production scope."""

from __future__ import annotations

from typing import Any

from ..core.trace import trace_record
from ..core.units import non_negative, positive


def calculate_photovoltaic(renewables: dict[str, Any]) -> dict[str, Any]:
    pv = renewables.get("photovoltaic") if isinstance(renewables, dict) else None
    if not pv or pv.get("enabled") is False:
        return {"status": "not_applicable", "annualProductionKWh": 0, "monthlyProductionKWh": []}
    if "annualProductionKWh" in pv and "installedPowerKWp" not in pv:
        annual = non_negative(pv.get("annualProductionKWh"), "renewables.photovoltaic.annualProductionKWh")
        return {
            "status": "calculated",
            "annualProductionKWh": annual,
            "monthlyProductionKWh": [],
            "executionTrace": [
                trace_record(
                    chapter="4",
                    formula_id="CHAPTER_4_SUPPORTED_PV_PRODUCT_ANNUAL_PRODUCTION",
                    branch_id="annual_product_generation_input",
                    inputs={"annualProductionKWh": annual},
                    units={"annualProductionKWh": "kWh/year"},
                    raw_result=annual,
                    final_result={"annualProductionKWh": annual},
                    expression="E_PV,annual supplied as supported product/project PV production input",
                    provenance={
                        "classification": "PRODUCT_DATA",
                        "source": "LaCurent Chapter 4 supported PV annual production contract",
                    },
                )
            ],
        }
    installed_power_kwp = positive(pv.get("installedPowerKWp"), "renewables.photovoltaic.installedPowerKWp")
    monthly_yield = pv.get("monthlySpecificYieldKWhPerKWp")
    if not isinstance(monthly_yield, list) or len(monthly_yield) != 12:
        raise ValueError("renewables.photovoltaic.monthlySpecificYieldKWhPerKWp must contain 12 values")
    monthly = [
        installed_power_kwp * non_negative(value, f"renewables.photovoltaic.monthlySpecificYieldKWhPerKWp[{index}]")
        for index, value in enumerate(monthly_yield)
    ]
    annual = sum(monthly)
    return {
        "status": "calculated",
        "annualProductionKWh": annual,
        "monthlyProductionKWh": monthly,
        "executionTrace": [
            trace_record(
                chapter="4",
                formula_id="CHAPTER_4_SUPPORTED_PV_SPECIFIC_YIELD",
                branch_id="installed_power_times_monthly_specific_yield",
                inputs={
                    "installedPowerKWp": installed_power_kwp,
                    "monthlySpecificYieldKWhPerKWp": monthly_yield,
                },
                units={
                    "installedPowerKWp": "kWp",
                    "monthlySpecificYieldKWhPerKWp": "kWh/kWp/month",
                    "monthlyProductionKWh": "kWh/month",
                },
                raw_result=monthly,
                final_result={"annualProductionKWh": annual},
                expression="E_PV,month = P_installed * Y_specific,month",
                provenance={
                    "classification": "NUMERICALLY_IMPLEMENTED",
                    "source": "LaCurent Chapter 4 supported PV production subset",
                },
            )
        ],
    }
