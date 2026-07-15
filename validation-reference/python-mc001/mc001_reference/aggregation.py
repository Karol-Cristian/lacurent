"""Aggregation helpers."""

from __future__ import annotations


def annual_sum(monthly_results: list[dict], field: str) -> float:
    if len(monthly_results) != 12:
        raise ValueError("annual demand requires exactly 12 monthly results")
    return sum(float(month[field]) for month in monthly_results)

