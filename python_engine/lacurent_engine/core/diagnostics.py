"""Stable calculation diagnostics for product integration."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED = "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"
LENI_SR_EN_15193_1_REQUIRED = "LENI_SR_EN_15193_1_REQUIRED"
MISSING_ENGINE_INPUT = "MISSING_ENGINE_INPUT"
INVALID_ENGINE_INPUT = "INVALID_ENGINE_INPUT"
UNSUPPORTED_ENGINE_INPUT_DIALECT = "UNSUPPORTED_ENGINE_INPUT_DIALECT"


@dataclass(frozen=True)
class Diagnostic:
    code: str
    severity: str
    message: str
    path: str | None = None
    expected_unit: str | None = None
    accepted_provenance: tuple[str, ...] = ()
    context: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        if not value["accepted_provenance"]:
            value.pop("accepted_provenance")
        if value["context"] is None:
            value.pop("context")
        if value["expected_unit"] is None:
            value.pop("expected_unit")
        if value["path"] is None:
            value.pop("path")
        return value


def diagnostic(
    code: str,
    message: str,
    *,
    severity: str = "blocking",
    path: str | None = None,
    expected_unit: str | None = None,
    accepted_provenance: tuple[str, ...] = (),
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return Diagnostic(
        code=code,
        severity=severity,
        message=message,
        path=path,
        expected_unit=expected_unit,
        accepted_provenance=accepted_provenance,
        context=context,
    ).to_dict()


def solar_gain_blocker(months: list[str] | None = None) -> dict[str, Any]:
    return diagnostic(
        SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED,
        (
            "Chapter 2 solar gains require Qsky-compatible preprocessing and "
            "complete solar element inputs. The owned source-backed Hsol dataset "
            "is available, but the missing preprocessing is not silently replaced."
        ),
        path="climate.solar",
        expected_unit="kWh/month",
        accepted_provenance=("CLIMATE_PROVIDER_AVAILABLE", "USER_REQUIRED", "PRODUCT_DATA"),
        context={
            "availableInputs": ["Hsol_vertical_horizontal_A9_6"],
            "missingInputs": ["Qsky", "Qsol", "solarElementInputs"],
            "affectedCalculations": [
                "chapter2_solar_gains",
                "chapter2_heating_useful_demand",
                "chapter2_cooling_useful_demand",
            ],
            "months": months or [],
        },
    )


def leni_external_blocker() -> dict[str, Any]:
    return diagnostic(
        LENI_SR_EN_15193_1_REQUIRED,
        "LENI lighting calculation is delegated outside the owned MC001 Chapter 3 implementation to SR EN 15193-1.",
        path="systems.lighting",
        expected_unit="kWh/(m2*year)",
        accepted_provenance=("EXTERNAL_STANDARD_REQUIRED",),
        context={
            "externalDependency": "SR EN 15193-1",
            "relationId": "3.4_EQ_34_LENI",
        },
    )
