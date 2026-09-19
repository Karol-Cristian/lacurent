from __future__ import annotations

from fastapi.testclient import TestClient

from commercial.app.engine import calculate, demo_building
from commercial.app.engine_pbe import compare_calculation_result, runtime_probe
from commercial.app.main import app


client = TestClient(app)


def test_vendored_pbe_primary_energy_matches_current_accounting() -> None:
    result = calculate(demo_building(), include_reference=False)
    comparison = compare_calculation_result(result)

    assert comparison["status"] == "ok"
    assert comparison["comparison"]["matches_current_accounting"] is True
    assert comparison["comparison"]["absolute_delta_kwh"] <= 0.01
    assert comparison["pbe"]["upstream_version"] == "2.0.3"
    assert comparison["pbe"]["upstream_primary_energy_blob"] == (
        "0129d346b8e8fce4f6f426d9d383878887c405d9"
    )


def test_pbe_runtime_probe_executes_numpy_pandas_and_vendor_module() -> None:
    probe = runtime_probe()

    assert probe["status"] == "ok"
    assert probe["numpy_version"]
    assert probe["pandas_version"]
    assert probe["pbe_upstream_version"] == "2.0.3"
    # Romanian MC001 factors used by LaCurent in this PoC:
    # 1000 kWh gas * 1.17 + 500 kWh electricity * 2.5 = 2420 kWh.
    assert probe["probe_primary_energy_kwh"] == 2420.0


def test_experimental_pbe_http_endpoints() -> None:
    health = client.get("/api/experimental/pbe-health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    demo = client.get("/api/experimental/pbe-demo")
    assert demo.status_code == 200
    payload = demo.json()
    assert payload["status"] == "ok"
    assert payload["comparison"]["matches_current_accounting"] is True
    assert payload["pbe"]["delivered_energy_by_carrier_kwh"]
