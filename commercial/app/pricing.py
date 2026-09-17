from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
MONTH_DAYS = {
    "ian": 31,
    "feb": 28,
    "mar": 31,
    "apr": 30,
    "mai": 31,
    "iun": 30,
    "iul": 31,
    "aug": 31,
    "sep": 30,
    "oct": 31,
    "nov": 30,
    "dec": 31,
}
SERVICE_LABELS = {
    "heating": "Încălzire",
    "cooling": "Răcire",
    "dhw": "Apă caldă menajeră",
}


@lru_cache(maxsize=1)
def energy_prices() -> dict[str, Any]:
    return json.loads((DATA_DIR / "energy-prices.json").read_text(encoding="utf-8"))


def _normalize(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(ch for ch in text if not unicodedata.combining(ch)).lower().strip()


def _key(value: Any) -> str:
    return str(getattr(value, "value", value))


def _electricity_reference(county: str | None) -> dict[str, Any]:
    data = energy_prices()["electricity"]
    normalized_county = _normalize(county)
    operator = None
    for candidate, counties in data["operator_counties"].items():
        if any(_normalize(item) == normalized_county for item in counties):
            operator = candidate
            break
    if not operator:
        operator = "Distribuție Energie Electrică România"
    return {
        "unit_price_lei_per_kwh": float(data["operator_prices_lei_per_kwh"][operator]),
        "basis": f"{data['product']} · {data['voltage_level']} · {operator}",
        "source_name": data["source_name"],
        "source_url": data["source_url"],
        "valid_until": data.get("valid_until"),
        "note": data["note"],
    }


def _gas_reference() -> dict[str, Any]:
    data = energy_prices()["natural_gas"]
    return {
        "unit_price_lei_per_kwh": float(data["reference_price_lei_per_kwh"]),
        "basis": f"{data['product']} · referință medie Distrigaz Sud / Delgaz Grid",
        "source_name": data["source_name"],
        "source_url": data["source_url"],
        "valid_until": data.get("valid_until"),
        "note": data["note"],
    }


def _firewood_reference() -> dict[str, Any]:
    data = energy_prices()["firewood"]
    base_price_per_m3 = float(data["price_lei_per_solid_m3"])
    consumer_multiplier = float(data.get("consumer_cost_multiplier", 1.0))
    price_per_m3 = base_price_per_m3 * consumer_multiplier
    energy_per_m3 = float(data["energy_kwh_per_solid_m3"])
    return {
        "unit_price_lei_per_kwh": price_per_m3 / energy_per_m3,
        "price_lei_per_m3": price_per_m3,
        "base_price_lei_per_m3": base_price_per_m3,
        "consumer_cost_multiplier": consumer_multiplier,
        "consumer_cost_multiplier_note": data.get("consumer_cost_multiplier_note"),
        "energy_kwh_per_m3": energy_per_m3,
        "basis": (
            f"{data['price_reference']} · Romsilva {base_price_per_m3:.0f} lei/m³ · "
            f"estimare consumator ×{consumer_multiplier:.1f} = {price_per_m3:.0f} lei/m³ · "
            f"{data['assumed_water_content_percent']}% umiditate"
        ),
        "source_name": data["source_name"],
        "source_url": data["source_url"],
        "catalog_url": data["catalog_url"],
        "energy_source_name": data["energy_source_name"],
        "energy_source_url": data["energy_source_url"],
        "note": data["note"],
    }


def _pellet_reference() -> dict[str, Any]:
    data = energy_prices()["pellets"]
    price_per_kg = float(data["reference_price_lei_per_kg"])
    energy_per_kg = float(data["energy_kwh_per_kg"])
    return {
        "unit_price_lei_per_kwh": price_per_kg / energy_per_kg,
        "price_lei_per_kg": price_per_kg,
        "price_lei_per_tonne": float(data["reference_price_lei_per_tonne"]),
        "price_lei_per_15kg_bag": float(data["price_lei_per_15kg_bag"]),
        "energy_kwh_per_kg": energy_per_kg,
        "basis": (
            f"{data['price_reference']} · "
            f"≈{float(data['reference_price_lei_per_tonne']):.0f} lei/tonă · referință retail, nu tarif oficial"
        ),
        "source_name": data["source_name"],
        "source_url": data["source_url"],
        "secondary_source_name": data.get("secondary_source_name"),
        "secondary_source_url": data.get("secondary_source_url"),
        "energy_source_name": data.get("energy_source_name"),
        "energy_source_url": data.get("energy_source_url"),
        "note": data["note"],
    }


def _reference_for(
    carrier: str,
    county: str | None,
    cost_profile: str | None = None,
) -> tuple[dict[str, Any] | None, str | None, str]:
    if carrier == "electricity":
        return _electricity_reference(county), None, "Electricitate"
    if carrier == "natural_gas":
        return _gas_reference(), None, "Gaz natural"
    if carrier == "biomass" and cost_profile == "firewood":
        return _firewood_reference(), None, "Lemn de foc"
    if carrier == "biomass" and cost_profile == "pellets":
        return _pellet_reference(), None, "Peleți"
    if carrier == "district_heat":
        return None, "Termoficare: tariful este local și trebuie preluat de la operatorul sistemului din localitate.", "Termoficare"
    if carrier == "biomass":
        return None, "Lemn / peleți: profilul selectat nu permite alegerea automată a unui preț unic.", "Lemn / peleți"
    return None, f"{carrier}: nu există o referință automată de preț pentru profilul selectat.", carrier


def _service_carriers(result: Any) -> dict[str, tuple[str, str | None]]:
    heating_carrier = _key(result.input.heating.carrier)
    heating_profile = getattr(result.input.heating, "cost_profile", None)
    dhw_carrier = _key(result.input.dhw.carrier)
    dhw_profile = heating_profile if dhw_carrier == "biomass" else None
    return {
        "heating": (heating_carrier, heating_profile),
        "cooling": ("electricity", "electricity"),
        "dhw": (dhw_carrier, dhw_profile),
    }


def _service_cost_rows(result: Any, county: str | None) -> list[dict[str, Any]]:
    carriers = _service_carriers(result)
    rows: list[dict[str, Any]] = []
    for service in ("heating", "cooling", "dhw"):
        final_kwh = float(result.final_energy_by_service.get(service, 0) or 0)
        carrier, profile = carriers[service]
        reference, note, carrier_label = _reference_for(carrier, county, profile)
        unit_price = float(reference["unit_price_lei_per_kwh"]) if reference else None
        annual_cost = final_kwh * unit_price if unit_price is not None else None
        row = {
            "service": service,
            "label": SERVICE_LABELS[service],
            "carrier": carrier,
            "carrier_label": carrier_label,
            "final_kwh": final_kwh,
            "unit_price_lei_per_kwh": unit_price,
            "annual_cost_lei": annual_cost,
            "priced": reference is not None,
            "unpriced_note": note,
        }
        if reference:
            row.update(reference)
        rows.append(row)
    return rows


def _monthly_cost_rows(result: Any, service_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    service_map = {row["service"]: row for row in service_rows}
    heating_useful_total = sum(float(row.useful_heating_kwh) for row in result.monthly)
    cooling_useful_total = sum(float(row.useful_cooling_kwh) for row in result.monthly)
    heating_final_total = service_map["heating"]["final_kwh"]
    cooling_final_total = service_map["cooling"]["final_kwh"]
    dhw_final_total = service_map["dhw"]["final_kwh"]
    total_days = sum(MONTH_DAYS.values())
    rows: list[dict[str, Any]] = []

    for item in result.monthly:
        month = str(item.month)
        heating_final = (
            heating_final_total * float(item.useful_heating_kwh) / heating_useful_total
            if heating_useful_total > 0
            else 0.0
        )
        cooling_final = (
            cooling_final_total * float(item.useful_cooling_kwh) / cooling_useful_total
            if cooling_useful_total > 0
            else 0.0
        )
        dhw_final = dhw_final_total * MONTH_DAYS.get(month, 365 / 12) / total_days
        service_final = {
            "heating": heating_final,
            "cooling": cooling_final,
            "dhw": dhw_final,
        }
        service_costs: dict[str, float | None] = {}
        priced_total = 0.0
        complete = True
        for service, final_kwh in service_final.items():
            unit_price = service_map[service]["unit_price_lei_per_kwh"]
            if unit_price is None and final_kwh > 0.0001:
                service_costs[service] = None
                complete = False
            elif unit_price is None:
                service_costs[service] = 0.0
            else:
                cost = final_kwh * float(unit_price)
                service_costs[service] = cost
                priced_total += cost
        rows.append(
            {
                "month": month,
                "final_kwh_by_service": service_final,
                "cost_lei_by_service": service_costs,
                "priced_total_lei": priced_total,
                "complete": complete,
            }
        )
    return rows


def estimate_energy_cost(result: Any) -> dict[str, Any]:
    county = result.climate.get("selected_locality", {}).get("county")
    heating_profile = getattr(result.input.heating, "cost_profile", None)
    rows: list[dict[str, Any]] = []
    priced_total = 0.0
    unpriced: list[str] = []

    for carrier, raw_kwh in result.final_energy_by_carrier.items():
        key = _key(carrier)
        final_kwh = float(raw_kwh)
        profile = heating_profile if key == "biomass" else None
        reference, note, label = _reference_for(key, county, profile)
        if note and note not in unpriced:
            unpriced.append(note)
        if reference:
            unit_price = float(reference["unit_price_lei_per_kwh"])
            cost = final_kwh * unit_price
            priced_total += cost
            row = {
                "carrier": key,
                "label": label,
                "final_kwh": final_kwh,
                "unit_price_lei_per_kwh": unit_price,
                "annual_cost_lei": cost,
                **reference,
            }
            if key == "biomass" and heating_profile == "firewood":
                row["estimated_volume_m3"] = final_kwh / float(reference["energy_kwh_per_m3"])
            if key == "biomass" and heating_profile == "pellets":
                row["estimated_mass_tonnes"] = final_kwh / float(reference["energy_kwh_per_kg"]) / 1000
            rows.append(row)

    service_rows = _service_cost_rows(result, county)
    monthly_rows = _monthly_cost_rows(result, service_rows)
    service_unpriced = [
        row["unpriced_note"]
        for row in service_rows
        if row["unpriced_note"] and row["final_kwh"] > 0.0001
    ]
    for note in service_unpriced:
        if note not in unpriced:
            unpriced.append(note)

    return {
        "rows": rows,
        "service_rows": service_rows,
        "monthly_rows": monthly_rows,
        "priced_total_lei": priced_total,
        "average_monthly_priced_lei": priced_total / 12,
        "complete": not unpriced,
        "unpriced_notes": unpriced,
        "retrieved_on": energy_prices()["retrieved_on"],
        "version": energy_prices()["version"],
        "disclaimer": (
            "Costurile sunt estimări bazate pe energia finală cumpărată și pe referințe oficiale sau de piață explicit marcate. "
            "Factura reală depinde de contract, furnizor, operator, taxe, categoria de consum, sezon și condițiile locale."
        ),
    }
