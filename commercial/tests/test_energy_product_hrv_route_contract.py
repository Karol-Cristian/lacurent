from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / "commercial" / "app" / "main.py"
STORE = ROOT / "commercial" / "app" / "energy_product_catalog_store.py"
ADAPTER = ROOT / "commercial" / "app" / "energy_product_teo_adapter.py"


def test_hrv_finalist_route_is_bounded_and_downstream_of_teo():
    source = MAIN.read_text(encoding="utf-8")
    section = source.split(
        '@app.post("/api/optimization/commercialize/hrv-finalist")',
        1,
    )[1].split(
        '@app.post("/api/optimization/candidate")',
        1,
    )[0]

    assert 'read_energy_product_candidate_window_d1(' in section
    assert '"hrv_unit"' in section
    assert 'limit=payload.category_limit' in section
    assert 'commercialize_hrv_finalist(' in section
    assert '"stage": "hrv_finalist_product_recheck"' in section

    # The route receives a pre-existing raw/finalist candidate. It must not run
    # the TEO search or iterate marketplace products inside search.
    assert "run_parametric_optimization(" not in section
    assert "run_physics_informed_optimization(" not in section
    assert "_optimizer_heating_catalog(" not in section


def test_energy_product_store_caps_category_windows_and_blocks_incomplete_products():
    source = STORE.read_text(encoding="utf-8")

    assert "return max(1, min(int(limit), 100))" in source
    assert "evidence_status IN ('source_backed','document_backed','reviewed')" in source
    assert "missing_teo_properties(category_id, normalized)" in source
    assert '"reason": "missing_teo_properties"' in source
    assert '"catalog_mode": "bounded_d1_category_window"' in source


def test_hrv_adapter_requires_canonical_recalculation_with_product_fan_data():
    source = ADAPTER.read_text(encoding="utf-8")
    section = source.split(
        "def commercialize_hrv_finalist(",
        1,
    )[1].split(
        "@dataclass(frozen=True)\nclass UnderfloorDesignRequirement",
        1,
    )[0]

    assert '"heat_recovery_efficiency": match.heat_recovery_efficiency' in section
    assert '"specific_fan_power_w_per_m3h": match.specific_power_input_w_m3h' in section
    assert '"fan_operation_hours_per_year": hours' in section
    assert "result = calculate(realized_building, include_reference=False)" in section
    assert "priced = estimate_energy_cost(result)" in section


def test_emitter_and_underfloor_routes_use_bounded_category_windows():
    source = MAIN.read_text(encoding="utf-8")

    radiator = source.split(
        '@app.post("/api/optimization/commercialize/radiator-finalist")',
        1,
    )[1].split(
        '@app.post("/api/optimization/commercialize/underfloor-pipe-finalist")',
        1,
    )[0]
    assert 'read_energy_product_candidate_window_d1(' in radiator
    assert '"radiator"' in radiator
    assert 'commercialize_radiator_bom_from_finalist(' in radiator
    assert "run_parametric_optimization(" not in radiator

    underfloor = source.split(
        '@app.post("/api/optimization/commercialize/underfloor-pipe-finalist")',
        1,
    )[1].split(
        '@app.post("/api/optimization/candidate")',
        1,
    )[0]
    assert 'read_energy_product_candidate_window_d1(' in underfloor
    assert '"underfloor_pipe"' in underfloor
    assert 'commercialize_underfloor_pipe_bom_from_finalist(' in underfloor
    assert "verified_available_heat_output_w_m2" in underfloor
    assert "run_parametric_optimization(" not in underfloor



def test_radiator_finalist_route_derives_bom_from_canonical_finalist():
    source = MAIN.read_text(encoding="utf-8")
    section = source.split(
        '@app.post("/api/optimization/commercialize/radiator-finalist")',
        1,
    )[1].split(
        '@app.post("/api/optimization/commercialize/underfloor-pipe-finalist")',
        1,
    )[0]

    assert 'read_energy_product_candidate_window_d1(' in section
    assert '"radiator"' in section
    assert 'limit=payload.category_limit' in section
    assert 'commercialize_radiator_bom_from_finalist(' in section
    assert '"stage": "radiator_finalist_bom_recheck"' in section
    assert "run_parametric_optimization(" not in section
    assert "run_physics_informed_optimization(" not in section


def test_underfloor_finalist_route_requires_explicit_design_feasibility():
    source = MAIN.read_text(encoding="utf-8")
    section = source.split(
        '@app.post("/api/optimization/commercialize/underfloor-pipe-finalist")',
        1,
    )[1].split(
        '@app.post("/api/optimization/candidate")',
        1,
    )[0]

    assert 'read_energy_product_candidate_window_d1(' in section
    assert '"underfloor_pipe"' in section
    assert 'limit=payload.category_limit' in section
    assert 'commercialize_underfloor_pipe_bom_from_finalist(' in section
    assert 'active_area_m2=payload.active_area_m2' in section
    assert 'spacing_mm=payload.spacing_mm' in section
    assert 'max_loop_length_m=payload.max_loop_length_m' in section
    assert 'verified_available_heat_output_w_m2=(' in section
    assert '"stage": "underfloor_pipe_finalist_bom_recheck"' in section
    assert "run_parametric_optimization(" not in section
    assert "run_physics_informed_optimization(" not in section


def test_radiator_and_underfloor_adapters_derive_requirements_from_finalist():
    source = ADAPTER.read_text(encoding="utf-8")

    radiator = source.split(
        "def commercialize_radiator_bom_from_finalist(",
        1,
    )[1].split(
        "def commercialize_underfloor_pipe_bom_from_finalist(",
        1,
    )[0]
    assert "result = calculate(" in radiator
    assert "design_heat_load_breakdown(" in radiator
    assert "result.heating_system.design_flow_temperature_c" in radiator
    assert "result.heating_system.design_return_temperature_c" in radiator
    assert "float(required_kw) * 1000.0" in radiator

    underfloor = source.split(
        "def commercialize_underfloor_pipe_bom_from_finalist(",
        1,
    )[1]
    assert "result = calculate(" in underfloor
    assert "design_heat_load_breakdown(" in underfloor
    assert "required_heat_output_w=float(required_kw) * 1000.0" in underfloor
    assert "verified_available_heat_output_w_m2=(" in underfloor



def test_underfloor_system_route_loads_only_required_bounded_categories():
    source = MAIN.read_text(encoding="utf-8")
    section = source.split(
        '@app.post("/api/optimization/commercialize/underfloor-system-finalist")',
        1,
    )[1].split(
        '@app.post("/api/optimization/candidate")',
        1,
    )[0]

    assert '"underfloor_pipe"' in section
    assert '"underfloor_manifold"' in section
    assert '"heating_control"' in section
    assert "if payload.control_zone_count is not None:" in section
    assert "commercialize_underfloor_system_bom_from_finalist(" in section
    assert '"stage": "underfloor_system_finalist_bom_recheck"' in section
    assert "run_parametric_optimization(" not in section
    assert "run_physics_informed_optimization(" not in section
