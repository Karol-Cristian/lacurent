from __future__ import annotations

import json
import math

from commercial.app.pbe_iso52016_compare import (
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
