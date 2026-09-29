from __future__ import annotations

import json
from pathlib import Path

from commercial.app.engine import calculate, demo_building
from commercial.app.models import model_to_json
from commercial.app.rbpe_service import calculate_render_context_json


ROOT = Path(__file__).resolve().parents[2]


def test_private_render_context_matches_canonical_demo_result() -> None:
    building = demo_building()
    canonical = calculate(building, include_reference=False)
    context = json.loads(calculate_render_context_json(model_to_json(building)))

    result = context["result"]
    assert result["total_final_energy_kwh"] == canonical.total_final_energy_kwh
    assert (
        result["primary_energy"]["specific_kwh_m2"]
        == canonical.primary_energy.specific_kwh_m2
    )
    assert result["energy_class"] == canonical.energy_class
    assert context["payload"] == model_to_json(building)
    assert context["service_max"] > 0
    assert context["monthly_max"] > 0
    assert context["cost_estimate"]["complete"] is True


def test_public_legacy_routes_do_not_execute_canonical_physics() -> None:
    source = (ROOT / "commercial" / "app" / "main.py").read_text(encoding="utf-8")

    render_section = source.split(
        "async def render_calculation_from_form(",
        1,
    )[1].split(
        '@app.get("/api/location-data")',
        1,
    )[0]
    assert "_private_rbpe_render_context" in render_section
    assert "= calculate(" not in render_section

    embed_section = source.split(
        '@app.post("/embed/{partner_id}/lab-calculate")',
        1,
    )[1].split(
        '@app.post("/embed/{partner_id}/calculate"',
        1,
    )[0]
    assert "_private_rbpe_api_json" in embed_section
    assert "= calculate(" not in embed_section

    partner_demo_section = source.split(
        '@app.get("/embed/{partner_id}/demo"',
        1,
    )[1].split(
        '@app.get("/demo"',
        1,
    )[0]
    assert "_private_rbpe_render_context" in partner_demo_section
    assert "= calculate(" not in partner_demo_section

    demo_section = source.split(
        "async def demo(request: Request)",
        1,
    )[1].split(
        '@app.post("/certificate"',
        1,
    )[0]
    assert "_private_rbpe_render_context" in demo_section
    assert "= calculate(" not in demo_section

    certificate_section = source.split(
        "async def certificate(request: Request)",
        1,
    )[1]
    assert "_private_rbpe_render_context" in certificate_section
    assert "= calculate(" not in certificate_section


def test_private_rbpe_router_exposes_render_context_rpc() -> None:
    shard = (ROOT / "commercial" / "reference-worker" / "worker.py").read_text(
        encoding="utf-8"
    )
    router = (ROOT / "commercial" / "rbpe-router" / "worker.mjs").read_text(
        encoding="utf-8"
    )

    assert "async def calculate_render_context_json(" in shard
    assert 'method === "calculate_render_context_json"' in router
    assert 'routeRpc(this.env, "calculate_render_context_json", [payload])' in router
