from __future__ import annotations

import json
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=1)
def energy_prices() -> dict[str, Any]:
    return json.loads((DATA_DIR / "energy-prices.json").read_text(encoding="utf-8"))


def _normalize(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(ch for ch in text if not unicodedata.combining(ch)).lower().strip()


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
    price_per_m3 = float(data["price_lei_per_solid_m3"])
    energy_per_m3 = float(data["energy_kwh_per_solid_m3"])
    return {
        "unit_price_lei_per_kwh": price_per_m3 / energy_per_m3,
        "price_lei_per_m3": price_per_m3,
        "energy_kwh_per_m3": energy_per_m3,
        "basis": f"{data['price_reference']} · {data['assumed_water_content_percent']}% umiditate",
        "source_name": data["source_name"],
        "source_url": data["source_url"],
        "catalog_url": data["catalog_url"],
        "energy_source_name": data["energy_source_name"],
        "energy_source_url": data["energy_source_url"],
        "note": data["note"],
    }


def estimate_energy_cost(result: Any) -> dict[str, Any]:
    county = result.climate.get("selected_locality", {}).get("county")
    heating_profile = getattr(result.input.heating, "cost_profile", None)
    rows: list[dict[str, Any]] = []
    priced_total = 0.0
    unpriced: list[str] = []

    for carrier, raw_kwh in result.final_energy_by_carrier.items():
        key = getattr(carrier, "value", carrier)
        final_kwh = float(raw_kwh)
        reference: dict[str, Any] | None = None
        label = str(key)

        if key == "electricity":
            label = "Electricitate"
            reference = _electricity_reference(county)
        elif key == "natural_gas":
            label = "Gaz natural"
            reference = _gas_reference()
        elif key == "biomass" and heating_profile == "firewood":
            label = "Lemn de foc"
            reference = _firewood_reference()
        elif key == "biomass" and heating_profile == "pellets":
            label = "Peleți"
            unpriced.append("Peleți: nu există un preț oficial național unic de retail disponibil pentru aplicare automată.")
        elif key == "district_heat":
            label = "Termoficare"
            unpriced.append("Termoficare: tariful este local și trebuie preluat de la operatorul sistemului din localitate.")
        else:
            label = {
                "biomass": "Lemn / peleți",
                "other": "Alt combustibil",
            }.get(str(key), str(key))
            unpriced.append(f"{label}: nu există o referință automată de preț pentru profilul selectat.")

        if reference:
            unit_price = float(reference["unit_price_lei_per_kwh"])
            cost = final_kwh * unit_price
            priced_total += cost
            row = {
                "carrier": str(key),
                "label": label,
                "final_kwh": final_kwh,
                "unit_price_lei_per_kwh": unit_price,
                "annual_cost_lei": cost,
                **reference,
            }
            if key == "biomass" and heating_profile == "firewood":
                row["estimated_volume_m3"] = final_kwh / float(reference["energy_kwh_per_m3"])
            rows.append(row)

    return {
        "rows": rows,
        "priced_total_lei": priced_total,
        "complete": not unpriced,
        "unpriced_notes": unpriced,
        "retrieved_on": energy_prices()["retrieved_on"],
        "version": energy_prices()["version"],
        "disclaimer": (
            "Costurile sunt estimări bazate pe energia finală cumpărată și pe referințe oficiale de preț. "
            "Factura reală depinde de contract, furnizor, operator, taxe, categoria de consum și condițiile locale."
        ),
    }
