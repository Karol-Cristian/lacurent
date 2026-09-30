from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from commercial.app.energy_product_teo_adapter import (
    ProductCandidate,
    candidate_from_source_pack_row,
    match_hrv_units,
    match_radiators,
    match_underfloor_pipe,
    radiator_output_at_design_condition_w,
)

ROOT = Path(__file__).resolve().parents[2]
SOURCE_PACK = ROOT / "commercial" / "data" / "energy_product_catalog_source_pack_v2.json"
IMPORTER = ROOT / "scripts" / "build-energy-product-catalog-d1-import.py"


def _load_source_rows():
    spec = importlib.util.spec_from_file_location("energy_catalog_importer", IMPORTER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.validate(module.load(SOURCE_PACK))["products"]


def test_purmo_radiator_can_be_matched_from_design_output_and_temperatures():
    rows = _load_source_rows()
    purmo = next(row for row in rows if row["product"]["id"] == "purmo-compact-c22-600x1000")
    candidate = candidate_from_source_pack_row(purmo)

    corrected = radiator_output_at_design_condition_w(
        declared_output_w_dt50=1709,
        exponent_n=1.3358,
        flow_temperature_c=55,
        return_temperature_c=45,
        room_temperature_c=20,
    )
    assert corrected < 1709

    match = match_radiators(
        [candidate],
        required_output_w=2500,
        flow_temperature_c=55,
        return_temperature_c=45,
        room_temperature_c=20,
    )
    assert match.quantity >= 2
    assert match.available_output_w >= 2500
    assert match.equipment_subtotal_lei == pytest.approx(509 * match.quantity)


def test_zehnder_is_rejected_until_official_recovery_efficiency_is_parsed():
    rows = _load_source_rows()
    zehnder = next(row for row in rows if row["product"]["id"] == "zehnder-comfoair-q350-hrv")
    candidate = candidate_from_source_pack_row(zehnder)

    with pytest.raises(ValueError, match="heat_recovery_efficiency"):
        match_hrv_units(
            [candidate],
            required_airflow_m3h=280,
            target_heat_recovery_efficiency=0.80,
        )


def test_hrv_match_requires_airflow_efficiency_and_spi():
    candidate = ProductCandidate(
        product_id="complete-hrv",
        category_id="hrv_unit",
        properties={
            "max_airflow_m3h": 350,
            "heat_recovery_efficiency": 0.88,
            "specific_power_input_w_m3h": 0.30,
        },
        unit_price_lei=12000,
    )
    match = match_hrv_units(
        [candidate],
        required_airflow_m3h=300,
        target_heat_recovery_efficiency=0.85,
        max_specific_power_input_w_m3h=0.35,
    )
    assert match.product_id == "complete-hrv"


def test_uponor_pipe_is_bom_matched_after_required_length_is_known():
    rows = _load_source_rows()
    uponor = next(row for row in rows if row["product"]["id"] == "uponor-comfort-pipe-plus-16x2-640")
    candidate = candidate_from_source_pack_row(uponor)

    match = match_underfloor_pipe([candidate], required_pipe_length_m=920)
    assert match.coil_count == 2
    assert match.purchased_length_m == pytest.approx(1280)
    assert match.material_subtotal_lei == pytest.approx(6400)
