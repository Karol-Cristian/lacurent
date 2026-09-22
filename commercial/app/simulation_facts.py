from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from .engine import calculate, demo_building
from .methodology import methodology
from .models import BuildingInput


FACT_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it"

FACTS_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS simulation_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact_key TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    search_question TEXT NOT NULL,
    claim TEXT NOT NULL,
    context TEXT NOT NULL,
    locality TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    scenario_label TEXT NOT NULL,
    metric_label TEXT NOT NULL,
    metric_unit TEXT NOT NULL,
    baseline_value REAL NOT NULL,
    scenario_value REAL NOT NULL,
    change_percent REAL NOT NULL,
    baseline_json TEXT NOT NULL,
    scenario_json TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    methodology_version TEXT NOT NULL,
    ai_model TEXT,
    generated_at TEXT NOT NULL,
    published_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published'
)
"""

FACT_LOCALITIES = (
    "București",
    "Cluj-Napoca",
    "Brașov",
    "Iași",
    "Timișoara",
    "Sibiu",
    "Constanța",
    "Craiova",
)

FACT_SCENARIOS: tuple[dict[str, str], ...] = (
    {
        "id": "wall-u-025",
        "label": "pereți exteriori îmbunătățiți la U 0,25 W/m²K",
        "title": "Izolația pereților",
        "question": "Cât contează îmbunătățirea pereților",
        "metric": "heating_demand",
    },
    {
        "id": "roof-u-015",
        "label": "acoperiș îmbunătățit la U 0,15 W/m²K",
        "title": "Izolația acoperișului",
        "question": "Cât contează îmbunătățirea acoperișului",
        "metric": "heating_demand",
    },
    {
        "id": "windows-u-090",
        "label": "ferestre îmbunătățite la U 0,90 W/m²K",
        "title": "Ferestre mai performante",
        "question": "Ce efect au ferestrele mai performante",
        "metric": "heating_demand",
    },
    {
        "id": "hrv-075",
        "label": "ventilație cu recuperare de căldură de 75%",
        "title": "Recuperarea de căldură",
        "question": "Ce efect are recuperarea de căldură",
        "metric": "heating_demand",
    },
    {
        "id": "setpoint-22",
        "label": "temperatură interioară de proiectare crescută de la 20°C la 22°C",
        "title": "Temperatura interioară",
        "question": "Cât schimbă consumul o temperatură interioară mai mare",
        "metric": "heating_demand",
    },
    {
        "id": "heat-pump-scop-35",
        "label": "pompă de căldură cu SCOP 3,5 în locul centralei în condensare",
        "title": "Pompă de căldură vs centrală în condensare",
        "question": "Cum se schimbă energia finală cu o pompă de căldură",
        "metric": "final_energy",
    },
)


def _d1_rows(result: Any) -> list[dict[str, Any]]:
    raw_rows = getattr(result, "results", None)
    if hasattr(raw_rows, "to_py"):
        raw_rows = raw_rows.to_py()
    return [dict(row) for row in (raw_rows or [])]


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:110] or "simulare"


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _change_percent(before: float, after: float) -> float:
    if before == 0:
        return 0.0
    return 100.0 * (after - before) / before


def _featured_roof_first_fact() -> dict[str, Any]:
    """A compact, indexable fact calculated from the same U×A envelope physics used by the engine.

    The example intentionally compares the same added insulation on two envelope
    elements. It demonstrates why "roof first" is a heuristic, not a universal rule.
    """
    wall_area = 100.0
    roof_area = 65.0
    wall_u_before = 0.42
    roof_u_before = 0.24
    added_insulation_m = 0.10
    insulation_lambda = 0.040
    added_r = added_insulation_m / insulation_lambda

    wall_u_after = 1.0 / ((1.0 / wall_u_before) + added_r)
    roof_u_after = 1.0 / ((1.0 / roof_u_before) + added_r)
    wall_delta_h = wall_area * (wall_u_before - wall_u_after)
    roof_delta_h = roof_area * (roof_u_before - roof_u_after)
    ratio = wall_delta_h / roof_delta_h

    return {
        "fact_kind": "comparison",
        "slug": "podul-trebuie-izolat-intotdeauna-primul",
        "title": "Podul primul? Nu întotdeauna.",
        "search_question": "Dacă „se ridică” căldura, trebuie să izolezi automat podul înaintea pereților?",
        "claim": (
            f"Nu neapărat. În exemplul calculat cu {wall_area:.0f} m² de pereți și {roof_area:.0f} m² de tavan, "
            f"aceeași izolație suplimentară de 10 cm are un impact de aproximativ {ratio:.1f} ori mai mare pe pereți."
        ),
        "context": (
            "În cazul acesta, pereții au suprafață mai mare și pornesc mai slab izolați. "
            "De aceea aceeași investiție în izolație poate produce mai mult acolo decât în pod."
        ),
        "locality": "Exemplu calculat",
        "scenario_id": "walls-vs-roof-extra-10cm",
        "scenario_label": "aceeași izolație suplimentară de 10 cm, λ 0,040 W/mK",
        "metric_label": "reducerea coeficientului de pierdere",
        "metric_unit": "W/K",
        "baseline_value": wall_delta_h,
        "scenario_value": roof_delta_h,
        "change_percent": (ratio - 1.0) * 100.0,
        "methodology_version": "H = U × A · R = d / λ",
        "ai_model": None,
        "generated_at": "2026-09-22T19:20:00+00:00",
        "published_at": "2026-09-22T19:20:00+00:00",
        "comparison_ratio": ratio,
        "comparison_left_label": "Pereți",
        "comparison_right_label": "Pod / tavan",
        "comparison_left_area_m2": wall_area,
        "comparison_right_area_m2": roof_area,
        "comparison_left_u_before": wall_u_before,
        "comparison_right_u_before": roof_u_before,
        "comparison_left_u_after": wall_u_after,
        "comparison_right_u_after": roof_u_after,
        "metrics": {},
    }


def _apply_scenario(payload: dict[str, Any], scenario_id: str) -> None:
    if scenario_id == "wall-u-025":
        for item in payload["envelope"]:
            if item["type"] == "exterior_wall":
                item["u_value_w_m2k"] = 0.25
        return
    if scenario_id == "roof-u-015":
        for item in payload["envelope"]:
            if item["type"] == "roof":
                item["u_value_w_m2k"] = 0.15
        return
    if scenario_id == "windows-u-090":
        for item in payload["envelope"]:
            if item["type"] == "window":
                item["u_value_w_m2k"] = 0.90
        return
    if scenario_id == "hrv-075":
        payload["ventilation"]["heat_recovery_efficiency"] = 0.75
        return
    if scenario_id == "setpoint-22":
        payload["indoor_design_temperature_c"] = 22
        return
    if scenario_id == "heat-pump-scop-35":
        payload["heating"] = {
            "system_type": "heat_pump",
            "carrier": "electricity",
            "scop": 3.5,
            "cost_profile": "electricity",
        }
        return
    raise ValueError(f"Unknown simulation-fact scenario: {scenario_id}")


def _metric_values(metric_id: str, baseline: Any, scenario: Any) -> tuple[str, str, float, float]:
    if metric_id == "heating_demand":
        return (
            "necesarul anual util pentru încălzire",
            "kWh/an",
            float(baseline.annual_heating_demand_kwh),
            float(scenario.annual_heating_demand_kwh),
        )
    if metric_id == "final_energy":
        return (
            "energia finală anuală",
            "kWh/an",
            float(baseline.total_final_energy_kwh),
            float(scenario.total_final_energy_kwh),
        )
    raise ValueError(f"Unknown metric: {metric_id}")


def _fact_claim(
    locality: str,
    scenario_label: str,
    metric_label: str,
    metric_unit: str,
    before: float,
    after: float,
) -> tuple[str, float]:
    change = _change_percent(before, after)
    magnitude = abs(change)
    direction = "a redus" if change < 0 else "a mărit" if change > 0 else "nu a schimbat"
    if abs(change) < 0.05:
        suffix = "fără o diferență procentuală relevantă în această simulare"
    else:
        suffix = f"cu {magnitude:.1f}%"
    claim = (
        f"În modelul LaCurent pentru o locuință demonstrativă de 160 m² din {locality}, "
        f"{scenario_label} {direction} {metric_label} de la {before:.0f} la {after:.0f} "
        f"{metric_unit}, {suffix}."
    )
    return claim, change


def _fallback_context() -> str:
    return (
        "Am schimbat un singur lucru și am păstrat restul casei identic, ca să vedem efectul intervenției. "
        "Rezultatul este orientativ și se poate schimba pentru o altă casă, altă climă sau alte instalații."
    )


async def _ai_context(ai: Any, fact: dict[str, Any]) -> str:
    if ai is None:
        return _fallback_context()
    try:
        from js import Object
        from pyodide.ffi import to_js as _to_js

        def to_js(value: Any) -> Any:
            return _to_js(value, dict_converter=Object.fromEntries)

        prompt = (
            "Ești editorul tehnic al LaCurent Home Lab. Primești rezultatul sigilat al unei simulări "
            "energetice. Scrie în română exact două propoziții scurte care explică de ce comparația "
            "este utilă unui proprietar. Nu folosi nicio cifră, nu inventa valori, nu face promisiuni, "
            "nu spune că rezultatul este universal și nu adăuga afirmații care nu rezultă din date. "
            "Nu folosi markdown. Datele sunt: "
            + json.dumps(
                {
                    "locality": fact["locality"],
                    "scenario": fact["scenario_label"],
                    "metric": fact["metric_label"],
                    "direction": "scădere" if fact["change_percent"] < 0 else "creștere",
                    "methodology_version": fact["methodology_version"],
                },
                ensure_ascii=False,
            )
        )
        response = await ai.run(
            FACT_AI_MODEL,
            to_js(
                {
                    "messages": [
                        {
                            "role": "system",
                            "content": "Explică rezultate tehnice fără a modifica datele furnizate.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "chat_template_kwargs": {"enable_thinking": False},
                }
            ),
        )
        if hasattr(response, "to_py"):
            response = response.to_py()
        text = ""
        if isinstance(response, dict):
            text = str(response.get("response") or "").strip()
        else:
            text = str(response or "").strip()
        text = re.sub(r"\s+", " ", text)
        # Numerical claims belong only to the deterministic engine-generated claim.
        if not text or re.search(r"\d", text):
            return _fallback_context()
        return text[:700]
    except Exception:
        return _fallback_context()


async def ensure_simulation_facts_schema(db: Any) -> None:
    await db.prepare(FACTS_CREATE_SQL).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS simulation_facts_status_date_idx "
        "ON simulation_facts(status, published_at DESC)"
    ).run()


def _build_fact(locality: str, scenario_spec: dict[str, str]) -> dict[str, Any]:
    version = str(methodology().get("version") or "unknown")
    baseline_payload = demo_building().model_dump(mode="json")
    baseline_payload["project_name"] = f"Simulare publică LaCurent — {locality}"
    baseline_payload["locality"] = locality

    # JSON round-trip gives an independent nested structure without relying on
    # Pydantic's assignment semantics.
    scenario_payload = json.loads(json.dumps(baseline_payload, ensure_ascii=False))
    _apply_scenario(scenario_payload, scenario_spec["id"])

    baseline_input = BuildingInput.model_validate(baseline_payload)
    scenario_input = BuildingInput.model_validate(scenario_payload)
    baseline_result = calculate(baseline_input, include_reference=False)
    scenario_result = calculate(scenario_input, include_reference=False)

    metric_label, metric_unit, before, after = _metric_values(
        scenario_spec["metric"], baseline_result, scenario_result
    )
    claim, change = _fact_claim(
        locality,
        scenario_spec["label"],
        metric_label,
        metric_unit,
        before,
        after,
    )
    fact_key = f"{version}|{locality}|{scenario_spec['id']}"
    slug = _slugify(f"{scenario_spec['title']}-{locality}-{scenario_spec['id']}")
    generated_at = _iso_now()
    return {
        "fact_key": fact_key,
        "slug": slug,
        "title": f"{scenario_spec['question']} în {locality}?",
        "search_question": f"{scenario_spec['question']} în {locality}?",
        "claim": claim,
        "context": _fallback_context(),
        "locality": locality,
        "scenario_id": scenario_spec["id"],
        "scenario_label": scenario_spec["label"],
        "metric_label": metric_label,
        "metric_unit": metric_unit,
        "baseline_value": before,
        "scenario_value": after,
        "change_percent": change,
        "baseline_json": json.dumps(baseline_payload, ensure_ascii=False, separators=(",", ":")),
        "scenario_json": json.dumps(scenario_payload, ensure_ascii=False, separators=(",", ":")),
        "metrics_json": json.dumps(
            {
                "baseline": {
                    "annual_heating_demand_kwh": baseline_result.annual_heating_demand_kwh,
                    "total_final_energy_kwh": baseline_result.total_final_energy_kwh,
                    "primary_specific_kwh_m2": baseline_result.primary_energy.specific_kwh_m2,
                    "co2_specific_kg_m2": baseline_result.co2.specific_kg_m2,
                    "energy_class": baseline_result.energy_class,
                },
                "scenario": {
                    "annual_heating_demand_kwh": scenario_result.annual_heating_demand_kwh,
                    "total_final_energy_kwh": scenario_result.total_final_energy_kwh,
                    "primary_specific_kwh_m2": scenario_result.primary_energy.specific_kwh_m2,
                    "co2_specific_kg_m2": scenario_result.co2.specific_kg_m2,
                    "energy_class": scenario_result.energy_class,
                },
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        "methodology_version": version,
        "ai_model": None,
        "generated_at": generated_at,
        "published_at": generated_at,
        "status": "published",
    }


async def publish_next_simulation_fact(env: Any) -> dict[str, Any] | None:
    db = getattr(env, "DB", None) if env is not None else None
    if db is None:
        return None
    await ensure_simulation_facts_schema(db)
    existing_result = await db.prepare(
        "SELECT fact_key FROM simulation_facts WHERE status = 'published'"
    ).run()
    existing = {str(row.get("fact_key")) for row in _d1_rows(existing_result)}

    version = str(methodology().get("version") or "unknown")
    selected: tuple[str, dict[str, str]] | None = None
    for locality in FACT_LOCALITIES:
        for scenario_spec in FACT_SCENARIOS:
            key = f"{version}|{locality}|{scenario_spec['id']}"
            if key not in existing:
                selected = (locality, scenario_spec)
                break
        if selected:
            break
    if selected is None:
        return None

    locality, scenario_spec = selected
    fact = _build_fact(locality, scenario_spec)
    ai = getattr(env, "AI", None)
    fact["context"] = await _ai_context(ai, fact)
    fact["ai_model"] = FACT_AI_MODEL if ai is not None else None

    await db.prepare(
        """
        INSERT OR IGNORE INTO simulation_facts (
            fact_key, slug, title, search_question, claim, context, locality,
            scenario_id, scenario_label, metric_label, metric_unit,
            baseline_value, scenario_value, change_percent,
            baseline_json, scenario_json, metrics_json, methodology_version,
            ai_model, generated_at, published_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
    ).bind(
        fact["fact_key"],
        fact["slug"],
        fact["title"],
        fact["search_question"],
        fact["claim"],
        fact["context"],
        fact["locality"],
        fact["scenario_id"],
        fact["scenario_label"],
        fact["metric_label"],
        fact["metric_unit"],
        fact["baseline_value"],
        fact["scenario_value"],
        fact["change_percent"],
        fact["baseline_json"],
        fact["scenario_json"],
        fact["metrics_json"],
        fact["methodology_version"],
        fact["ai_model"],
        fact["generated_at"],
        fact["published_at"],
        fact["status"],
    ).run()
    return fact


def _public_fact(row: dict[str, Any]) -> dict[str, Any]:
    fact = dict(row)
    try:
        fact["metrics"] = json.loads(str(fact.get("metrics_json") or "{}"))
    except Exception:
        fact["metrics"] = {}
    return fact


async def list_published_simulation_facts(db: Any, limit: int = 60) -> list[dict[str, Any]]:
    featured = _featured_roof_first_fact()
    if db is None:
        return [featured][:limit]
    try:
        await ensure_simulation_facts_schema(db)
        result = await db.prepare(
            """
            SELECT slug, title, search_question, claim, context, locality,
                   scenario_id, scenario_label, metric_label, metric_unit,
                   baseline_value, scenario_value, change_percent,
                   metrics_json, methodology_version, ai_model,
                   generated_at, published_at
            FROM simulation_facts
            WHERE status = 'published'
            ORDER BY published_at DESC, id DESC
            LIMIT ?
            """
        ).bind(int(max(1, min(limit, 100)))).run()
        dynamic = [_public_fact(row) for row in _d1_rows(result)]
    except Exception:
        # The curated calculated fact must remain public even if D1 is
        # temporarily unavailable or its schema cannot be initialized.
        dynamic = []
    dynamic = [item for item in dynamic if item.get("slug") != featured["slug"]]
    return [featured, *dynamic][:limit]


async def get_published_simulation_fact(db: Any, slug: str) -> dict[str, Any] | None:
    featured = _featured_roof_first_fact()
    if slug == featured["slug"]:
        return featured
    if db is None:
        return None
    await ensure_simulation_facts_schema(db)
    result = await db.prepare(
        """
        SELECT slug, title, search_question, claim, context, locality,
               scenario_id, scenario_label, metric_label, metric_unit,
               baseline_value, scenario_value, change_percent,
               baseline_json, scenario_json, metrics_json,
               methodology_version, ai_model, generated_at, published_at
        FROM simulation_facts
        WHERE status = 'published' AND slug = ?
        LIMIT 1
        """
    ).bind(slug).run()
    rows = _d1_rows(result)
    return _public_fact(rows[0]) if rows else None
