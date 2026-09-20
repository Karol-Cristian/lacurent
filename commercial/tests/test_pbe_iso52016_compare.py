from __future__ import annotations

import json
import math

from commercial.app.pbe_iso52016_compare import (
    run_controlled_air_losses_comparison,
    run_controlled_internal_gains_comparison,
    run_controlled_iso52016_comparison,
)


def test_controlled_lacurent_vs_upstream_iso52016() -> None:
    result = run_controlled_iso52016_comparison()
    print("\nPBE_ISO52016_COMPARISON=" + json.dumps(result, indent=2))

    assert result["status"] == "ok"
    assert result["scope"] == "controlled_above_ground_envelope_only"
    assert result["hours_compared"] == 8760
    assert result["lacurent"]["heating_need_kwh"] > 0
    assert result["pbe_iso52016"]["heating_need_kwh"] > 0
    assert result["pbe_iso52016"]["peak_heating_w"] > 0
    assert math.isfinite(result["comparison"]["relative_delta_percent"])
    assert result["runtime_ms"] < 60_000
    assert result["upstream"]["version"] == "2.0.3"
    assert result["upstream"]["utils"] == "860d69105c5f371abc25db9f60dba17c66d056d4"


def test_controlled_air_losses_lacurent_vs_upstream_iso52016() -> None:
    result = run_controlled_air_losses_comparison()
    print("\nPBE_ISO52016_AIR_LOSSES=" + json.dumps(result, indent=2))

    assert result["status"] == "ok"
    assert result["scope"] == "controlled_envelope_plus_ventilation_and_thermal_bridges"
    assert result["hours_compared"] == 8760
    assert result["resolved_coefficients"]["lacurent_h_ve_w_k"] > 0
    assert result["resolved_coefficients"]["thermal_bridge_h_w_k"] > 0
    assert result["pbe_iso52016"]["heating_need_kwh"] > 0
    assert math.isfinite(result["comparison"]["relative_delta_percent"])
    assert result["runtime_ms"] < 60_000


def test_controlled_internal_gains_lacurent_vs_upstream_iso52016() -> None:
    result = run_controlled_internal_gains_comparison()
    print("\nPBE_ISO52016_INTERNAL_GAINS=" + json.dumps(result, indent=2))

    assert result["status"] == "ok"
    assert result["scope"] == "controlled_envelope_air_losses_plus_constant_internal_gains"
    assert result["hours_compared"] == 8760
    assert result["resolved_inputs"]["expected_internal_gain_w"] == 640.0
    assert result["resolved_inputs"]["pbe_mean_internal_gain_w"] == 640.0
    assert result["lacurent"]["heating_need_kwh"] > 0
    assert result["pbe_iso52016"]["heating_need_kwh"] > 0
    assert math.isfinite(result["comparison"]["relative_delta_percent"])
    assert result["runtime_ms"] < 60_000
