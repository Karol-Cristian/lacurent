"""Numerical regression against the unchanged formula at 80-digit precision."""

from decimal import Decimal, localcontext
import math

import pytest

from commercial.app.engine import (
    _cooling_heat_transfer_utilization_factor,
    _heating_gain_utilization_factor,
    calculate,
    demo_building,
)
from commercial.app.models import BuildingInput


@pytest.mark.parametrize("mode", ["heating", "cooling"])
@pytest.mark.parametrize("gamma", [0.5, 0.75, 0.99999999, 1.0, 1.00000001, 1.5, 2.0])
@pytest.mark.parametrize("a", [2.5, 2000.0, 3000.0])
def test_utilization_matches_high_precision_formula(mode, gamma, a):
    # Tolerance chosen for float evaluation, not a physical-model accuracy claim.
    with localcontext() as ctx:
        ctx.prec = 80
        g = Decimal.from_float(gamma)
        exponent = Decimal.from_float(a)
        if gamma == 1.0:
            expected = exponent / (exponent + 1)
        else:
            sign = 1 if mode == "heating" else -1
            expected = (1 - g ** (sign * exponent)) / (
                1 - g ** (sign * (exponent + 1))
            )
    function = (_heating_gain_utilization_factor if mode == "heating"
                else _cooling_heat_transfer_utilization_factor)
    actual = function(gamma, a)
    assert math.isfinite(actual)
    assert 0 <= actual <= 1
    assert actual == pytest.approx(float(expected), rel=2e-12, abs=2e-14)


@pytest.mark.parametrize("cooling_enabled", [False, True])
def test_accepted_low_loss_building_does_not_overflow(cooling_enabled):
    # Deliberate physical-limit input, not a representative real house.
    data = demo_building().model_dump(mode="json")
    data.update(
        heated_floor_area_m2=100,
        envelope=[{"name": "Low-loss boundary", "type": "exterior_wall",
                   "area_m2": 100, "u_value_w_m2k": 0.001}],
        thermal_bridges=[],
        ventilation={"air_changes_per_hour": 0},
        internal_gains_w_m2=0.02,
        solar={"mode": "explicit"},
        solar_gains_kwh_m2_month=0,
        cooling={"enabled": cooling_enabled, "seer": 3.5, "setpoint_c": 26},
    )
    result = calculate(BuildingInput(**data), include_reference=False)
    for month in result.monthly:
        for key in ("useful_heating_kwh", "useful_cooling_kwh"):
            assert math.isfinite(getattr(month, key))
            assert getattr(month, key) >= 0


def test_zero_gain_and_negative_transfer_limits_are_preserved():
    assert _heating_gain_utilization_factor(0, 3) == 1
    assert _cooling_heat_transfer_utilization_factor(-1.6, 3) == 1
