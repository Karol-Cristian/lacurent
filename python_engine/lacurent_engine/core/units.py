"""Strict numeric and unit helpers.

The engine intentionally keeps this small: units are documented and carried
through traces, while dimensional conversions stay explicit at formula sites.
"""

from __future__ import annotations

import math
from typing import Any


class UnitError(ValueError):
    """Raised when a quantity is missing a required unit."""


class NumericError(ValueError):
    """Raised when numeric semantics would become ambiguous."""


def finite_number(value: Any, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise NumericError(f"{name} must be a finite number")
    number = float(value)
    if not math.isfinite(number):
        raise NumericError(f"{name} must be finite")
    return number


def non_negative(value: Any, name: str) -> float:
    number = finite_number(value, name)
    if number < 0:
        raise NumericError(f"{name} must be non-negative")
    return number


def positive(value: Any, name: str) -> float:
    number = finite_number(value, name)
    if number <= 0:
        raise NumericError(f"{name} must be positive")
    return number


def fraction(value: Any, name: str) -> float:
    number = finite_number(value, name)
    if number < 0 or number > 1:
        raise NumericError(f"{name} must be between 0 and 1")
    return number


def quantity(value: Any, unit: str, name: str, provenance: dict | None = None) -> dict:
    if not unit:
        raise UnitError(f"{name} requires an explicit unit")
    return {
        "value": finite_number(value, name),
        "unit": unit,
        "provenance": provenance or {"classification": "UNSPECIFIED"},
    }


def annual_sum(months: list[dict], key: str) -> float:
    return sum(finite_number(month.get(key, 0), f"monthly.{key}") for month in months)
