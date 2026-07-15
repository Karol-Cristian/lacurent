"""Monthly gains, including explicit adjacent unconditioned-zone gains."""

from __future__ import annotations

from .models import ensure_non_negative


def adjacent_zone_gains(zone: dict) -> dict:
    bztu = float(zone["bztu"])
    distribution = float(zone["distribution_factor"])
    reduction = float(zone["gain_reduction_factor"])
    if not 0 <= bztu <= 1:
        raise ValueError("bztu must be between 0 and 1")
    if distribution < 0 or reduction < 0:
        raise ValueError("adjacent gain factors must be non-negative")
    multiplier = (1.0 - bztu) * distribution * reduction
    internal = ensure_non_negative(zone["internal_gains_kwh"], "adjacent_internal_gains")
    solar = ensure_non_negative(zone["solar_gains_kwh"], "adjacent_solar_gains")
    return {
        "zone_id": zone["zone_id"],
        "bztu": bztu,
        "distribution_factor": distribution,
        "gain_reduction_factor": reduction,
        "internal_gain_contribution_kwh": multiplier * internal,
        "solar_gain_contribution_kwh": multiplier * solar,
        "branch": "explicit_adjacent_unconditioned_zone",
    }


def monthly_gains(month: dict) -> dict:
    direct_internal = ensure_non_negative(month["internal_gains_kwh"], "internal_gains_kwh")
    direct_solar = ensure_non_negative(month["solar_gains_kwh"], "solar_gains_kwh")
    adjacent = [adjacent_zone_gains(zone) for zone in month.get("adjacent_unconditioned_zones", [])]
    adjacent_internal = sum(zone["internal_gain_contribution_kwh"] for zone in adjacent)
    adjacent_solar = sum(zone["solar_gain_contribution_kwh"] for zone in adjacent)
    internal = direct_internal + adjacent_internal
    solar = direct_solar + adjacent_solar
    return {
        "direct_internal_gains_kwh": direct_internal,
        "direct_solar_gains_kwh": direct_solar,
        "adjacent_internal_gains_kwh": adjacent_internal,
        "adjacent_solar_gains_kwh": adjacent_solar,
        "adjacent_zones": adjacent,
        "internal_gains_kwh": internal,
        "solar_gains_kwh": solar,
        "qgn_kwh": internal + solar,
    }

