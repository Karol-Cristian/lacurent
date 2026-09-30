from __future__ import annotations

import hashlib
import json
import math
from typing import Any


IMPACT_SCHEMA_VERSION = "home-lab-impact-v1"
IMPACT_QUALITY_SCOPE = "user_saved_modelled"

IMPACT_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS home_lab_impact_snapshots (
    project_id TEXT PRIMARY KEY,
    owner_user_id INTEGER NOT NULL,
    project_name TEXT NOT NULL,
    baseline_input_fingerprint TEXT,
    teo_input_fingerprint TEXT,
    calculation_model_version TEXT,
    methodology_version TEXT,
    heated_area_m2 REAL,
    baseline_final_energy_kwh REAL NOT NULL,
    optimized_final_energy_kwh REAL NOT NULL,
    baseline_annual_cost_lei REAL NOT NULL,
    optimized_annual_cost_lei REAL NOT NULL,
    potential_saving_kwh_year REAL NOT NULL,
    potential_saving_lei_year REAL NOT NULL,
    estimated_capex_lei REAL NOT NULL,
    simple_payback_years REAL,
    baseline_co2_kg_year REAL,
    optimized_co2_kg_year REAL,
    potential_co2_reduction_kg_year REAL,
    data_quality TEXT NOT NULL DEFAULT 'user_saved_modelled',
    source_json TEXT,
    saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1
)
"""

IMPACT_UPSERT_SQL = """
INSERT INTO home_lab_impact_snapshots (
    project_id, owner_user_id, project_name,
    baseline_input_fingerprint, teo_input_fingerprint,
    calculation_model_version, methodology_version, heated_area_m2,
    baseline_final_energy_kwh, optimized_final_energy_kwh,
    baseline_annual_cost_lei, optimized_annual_cost_lei,
    potential_saving_kwh_year, potential_saving_lei_year,
    estimated_capex_lei, simple_payback_years,
    baseline_co2_kg_year, optimized_co2_kg_year,
    potential_co2_reduction_kg_year,
    data_quality, source_json, saved_at, updated_at, is_active
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
ON CONFLICT(project_id) DO UPDATE SET
    project_name = excluded.project_name,
    baseline_input_fingerprint = excluded.baseline_input_fingerprint,
    teo_input_fingerprint = excluded.teo_input_fingerprint,
    calculation_model_version = excluded.calculation_model_version,
    methodology_version = excluded.methodology_version,
    heated_area_m2 = excluded.heated_area_m2,
    baseline_final_energy_kwh = excluded.baseline_final_energy_kwh,
    optimized_final_energy_kwh = excluded.optimized_final_energy_kwh,
    baseline_annual_cost_lei = excluded.baseline_annual_cost_lei,
    optimized_annual_cost_lei = excluded.optimized_annual_cost_lei,
    potential_saving_kwh_year = excluded.potential_saving_kwh_year,
    potential_saving_lei_year = excluded.potential_saving_lei_year,
    estimated_capex_lei = excluded.estimated_capex_lei,
    simple_payback_years = excluded.simple_payback_years,
    baseline_co2_kg_year = excluded.baseline_co2_kg_year,
    optimized_co2_kg_year = excluded.optimized_co2_kg_year,
    potential_co2_reduction_kg_year = excluded.potential_co2_reduction_kg_year,
    data_quality = excluded.data_quality,
    source_json = excluded.source_json,
    saved_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    is_active = 1
"""

IMPACT_SUMMARY_SQL = """
SELECT
    COUNT(*) AS saved_houses,
    COALESCE(SUM(baseline_final_energy_kwh), 0) AS baseline_final_energy_kwh,
    COALESCE(SUM(optimized_final_energy_kwh), 0) AS optimized_final_energy_kwh,
    COALESCE(SUM(potential_saving_kwh_year), 0) AS potential_saving_kwh_year,
    COALESCE(SUM(potential_saving_lei_year), 0) AS potential_saving_lei_year,
    COALESCE(SUM(estimated_capex_lei), 0) AS estimated_capex_lei,
    COALESCE(SUM(potential_co2_reduction_kg_year), 0) AS potential_co2_reduction_kg_year
FROM home_lab_impact_snapshots
WHERE is_active = 1
  AND data_quality = 'user_saved_modelled'
"""


def _rows(result: Any) -> list[dict[str, Any]]:
    raw = getattr(result, "results", None)
    if hasattr(raw, "to_py"):
        raw = raw.to_py()
    return [dict(row) for row in (raw or [])]


def _finite_nonnegative(value: Any, field: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} trebuie să fie numeric.") from exc
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{field} trebuie să fie finit și pozitiv sau zero.")
    return number


def _optional_nonnegative(value: Any, field: str) -> float | None:
    if value is None or value == "":
        return None
    return _finite_nonnegative(value, field)


def normalize_impact_payload(payload: dict[str, Any]) -> dict[str, Any]:
    project_id = str(payload.get("projectId") or "").strip()
    if not project_id or len(project_id) > 120:
        raise ValueError("projectId este obligatoriu și trebuie să aibă maximum 120 caractere.")

    project_name = str(payload.get("projectName") or "Casa mea").strip()[:160] or "Casa mea"
    baseline = payload.get("baseline") if isinstance(payload.get("baseline"), dict) else {}
    optimized = payload.get("optimized") if isinstance(payload.get("optimized"), dict) else {}

    baseline_energy = _finite_nonnegative(baseline.get("finalEnergyKwh"), "baseline.finalEnergyKwh")
    optimized_energy = _finite_nonnegative(optimized.get("finalEnergyKwh"), "optimized.finalEnergyKwh")
    baseline_cost = _finite_nonnegative(baseline.get("annualCostLei"), "baseline.annualCostLei")
    optimized_cost = _finite_nonnegative(optimized.get("annualCostLei"), "optimized.annualCostLei")
    capex = _finite_nonnegative(optimized.get("capexLei"), "optimized.capexLei")

    energy_saving = max(baseline_energy - optimized_energy, 0.0)
    money_saving = max(baseline_cost - optimized_cost, 0.0)
    payback = capex / money_saving if capex > 0 and money_saving > 1e-9 else None

    baseline_co2 = _optional_nonnegative(baseline.get("co2KgYear"), "baseline.co2KgYear")
    optimized_co2 = _optional_nonnegative(optimized.get("co2KgYear"), "optimized.co2KgYear")
    co2_saving = (
        max(baseline_co2 - optimized_co2, 0.0)
        if baseline_co2 is not None and optimized_co2 is not None
        else None
    )

    source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
    source = {
        "schemaVersion": IMPACT_SCHEMA_VERSION,
        "scope": IMPACT_QUALITY_SCOPE,
        "locality": str(source.get("locality") or "")[:180],
        "savedFrom": "home_lab_editorial",
    }

    return {
        "project_id": project_id,
        "project_name": project_name,
        "baseline_input_fingerprint": str(payload.get("baselineInputFingerprint") or "")[:240],
        "teo_input_fingerprint": str(payload.get("teoInputFingerprint") or "")[:240],
        "calculation_model_version": str(payload.get("calculationModelVersion") or "")[:120],
        "methodology_version": str(payload.get("methodologyVersion") or "")[:160],
        "heated_area_m2": _optional_nonnegative(payload.get("heatedAreaM2"), "heatedAreaM2"),
        "baseline_final_energy_kwh": baseline_energy,
        "optimized_final_energy_kwh": optimized_energy,
        "baseline_annual_cost_lei": baseline_cost,
        "optimized_annual_cost_lei": optimized_cost,
        "potential_saving_kwh_year": energy_saving,
        "potential_saving_lei_year": money_saving,
        "estimated_capex_lei": capex,
        "simple_payback_years": payback,
        "baseline_co2_kg_year": baseline_co2,
        "optimized_co2_kg_year": optimized_co2,
        "potential_co2_reduction_kg_year": co2_saving,
        "data_quality": IMPACT_QUALITY_SCOPE,
        "source_json": json.dumps(source, ensure_ascii=False, separators=(",", ":")),
    }


def public_impact_summary(row: dict[str, Any] | None) -> dict[str, Any]:
    row = row or {}
    saved_houses = int(row.get("saved_houses") or 0)
    baseline_energy = float(row.get("baseline_final_energy_kwh") or 0.0)
    optimized_energy = float(row.get("optimized_final_energy_kwh") or 0.0)
    energy_saving = float(row.get("potential_saving_kwh_year") or 0.0)
    money_saving = float(row.get("potential_saving_lei_year") or 0.0)
    capex = float(row.get("estimated_capex_lei") or 0.0)
    co2_saving = float(row.get("potential_co2_reduction_kg_year") or 0.0)
    global_payback = capex / money_saving if capex > 0 and money_saving > 1e-9 else None
    reduction_percent = (
        100.0 * energy_saving / baseline_energy
        if baseline_energy > 1e-9
        else None
    )
    return {
        "available": True,
        "scope": IMPACT_QUALITY_SCOPE,
        "savedHouses": saved_houses,
        "baselineFinalEnergyKwhYear": baseline_energy,
        "optimizedFinalEnergyKwhYear": optimized_energy,
        "potentialSavingKwhYear": energy_saving,
        "potentialSavingLeiYear": money_saving,
        "estimatedCapexLei": capex,
        "globalSimplePaybackYears": global_payback,
        "potentialReductionPercent": reduction_percent,
        "potentialCo2ReductionKgYear": co2_saving,
        "method": {
            "deduplication": "latest_saved_snapshot_per_project_id",
            "globalPayback": "sum_capex_divided_by_sum_annual_saving",
            "measuredImpact": False,
        },
    }


async def ensure_impact_schema(db: Any) -> None:
    await db.prepare(IMPACT_CREATE_SQL).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS home_lab_impact_owner_idx "
        "ON home_lab_impact_snapshots(owner_user_id, updated_at)"
    ).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS home_lab_impact_active_idx "
        "ON home_lab_impact_snapshots(is_active, data_quality)"
    ).run()


def bearer_token(request: Any) -> str:
    header = str(request.headers.get("authorization") or "")
    if not header.lower().startswith("bearer "):
        return ""
    return header[7:].strip()


async def authenticated_user_id(request: Any, db: Any) -> int | None:
    token = bearer_token(request)
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    result = await db.prepare(
        """
        SELECT users.id
        FROM user_sessions
        JOIN users ON users.id = user_sessions.user_id
        WHERE user_sessions.token_hash = ?
          AND user_sessions.expires_at > datetime('now')
        LIMIT 1
        """
    ).bind(token_hash).run()
    rows = _rows(result)
    return int(rows[0]["id"]) if rows else None


async def save_impact_snapshot(db: Any, owner_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    await ensure_impact_schema(db)
    item = normalize_impact_payload(payload)

    existing = await db.prepare(
        "SELECT owner_user_id FROM home_lab_impact_snapshots WHERE project_id = ? LIMIT 1"
    ).bind(item["project_id"]).run()
    existing_rows = _rows(existing)
    if existing_rows and int(existing_rows[0].get("owner_user_id") or 0) != int(owner_user_id):
        raise PermissionError("Proiectul aparține altui cont.")

    statement = db.prepare(IMPACT_UPSERT_SQL)
    await statement.bind(
        item["project_id"],
        int(owner_user_id),
        item["project_name"],
        item["baseline_input_fingerprint"],
        item["teo_input_fingerprint"],
        item["calculation_model_version"],
        item["methodology_version"],
        item["heated_area_m2"],
        item["baseline_final_energy_kwh"],
        item["optimized_final_energy_kwh"],
        item["baseline_annual_cost_lei"],
        item["optimized_annual_cost_lei"],
        item["potential_saving_kwh_year"],
        item["potential_saving_lei_year"],
        item["estimated_capex_lei"],
        item["simple_payback_years"],
        item["baseline_co2_kg_year"],
        item["optimized_co2_kg_year"],
        item["potential_co2_reduction_kg_year"],
        item["data_quality"],
        item["source_json"],
    ).run()

    return {
        "saved": True,
        "projectId": item["project_id"],
        "scope": item["data_quality"],
        "potentialSavingKwhYear": item["potential_saving_kwh_year"],
        "potentialSavingLeiYear": item["potential_saving_lei_year"],
        "estimatedCapexLei": item["estimated_capex_lei"],
        "simplePaybackYears": item["simple_payback_years"],
    }


async def read_public_impact_summary(db: Any) -> dict[str, Any]:
    await ensure_impact_schema(db)
    result = await db.prepare(IMPACT_SUMMARY_SQL).run()
    rows = _rows(result)
    return public_impact_summary(rows[0] if rows else None)
