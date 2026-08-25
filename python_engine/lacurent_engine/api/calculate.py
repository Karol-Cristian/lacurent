"""Top-level Python engine calculation API and CLI."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

from .schemas import ENGINE_OUTPUT_SCHEMA_VERSION, build_engine_input_from_p3v_fixture, validate_engine_input
from .._p3v_kernel import import_calculator
from ..chapter2.envelope import normalize_chapter2_reference
from ..chapter2.solar import solar_blocker_if_present
from ..chapter3.shared_generation import calculate_shared_generator_case
from ..chapter4.photovoltaic import calculate_photovoltaic
from ..core.diagnostics import diagnostic, UNSUPPORTED_ENGINE_INPUT_DIALECT
from ..core.trace import blocked_trace


def _status_from_diagnostics(diagnostics: list[dict]) -> str:
    return "blocked" if any(item.get("severity") == "blocking" for item in diagnostics) else "ready"


def _calculate_reference_fixture(engine_input: dict[str, Any]) -> dict[str, Any]:
    fixture = engine_input.get("_referenceFixture")
    if not isinstance(fixture, dict):
        return _blocked_output(
            engine_input,
            [diagnostic("MISSING_REFERENCE_FIXTURE", "P3V reference input dialect requires _referenceFixture.", path="_referenceFixture")],
        )
    calculate_building = import_calculator()
    reference = calculate_building(fixture, engine="lacurent_python_engine")
    solar_diagnostics = solar_blocker_if_present(engine_input)
    pv_result = calculate_photovoltaic(engine_input.get("renewables", {}))
    chapter3_case = None
    if isinstance(engine_input.get("systems"), dict) and engine_input["systems"].get("sharedGeneratorReferenceCase"):
        chapter3_case = calculate_shared_generator_case(engine_input["systems"]["sharedGeneratorReferenceCase"])

    diagnostics = []
    if solar_diagnostics:
        diagnostics.extend(solar_diagnostics)
    status = "incomplete" if diagnostics else "ready"
    trace = [
        *normalize_chapter2_reference(reference)["executionTrace"],
        *(pv_result.get("executionTrace", []) if pv_result else []),
        *(chapter3_case.get("executionTrace", []) if chapter3_case else []),
    ]
    if solar_diagnostics:
        trace.append(blocked_trace(
            chapter="2",
            formula_id="MC001_CHAPTER_2_QSOL_PREPROCESSING",
            branch_id="source_backed_hsol_qsky_missing",
            diagnostics=solar_diagnostics,
            provenance={"classification": "EXTERNAL_STANDARD_REQUIRED", "source": "SR EN ISO 52010-1 / complete solar-element preprocessing"},
        ))
    return {
        "schemaVersion": ENGINE_OUTPUT_SCHEMA_VERSION,
        "engine": "python",
        "engineVersion": "p11.0",
        "status": status,
        "chapter2": normalize_chapter2_reference(reference),
        "chapter3": chapter3_case or {
            "status": "not_requested",
            "coverage": "functions available under lacurent_engine.chapter3; no project systems supplied in this fixture",
        },
        "chapter4": pv_result,
        "energyCarriers": chapter3_case.get("energyCarriers", {}) if chapter3_case else {},
        "diagnostics": diagnostics,
        "executionTrace": trace,
        "provenance": {
            "engineInput": "lacurent_engine_input_v1",
            "calculationKernel": "validation-reference/python-mc001 independent P3V formulas",
            "javascriptRuntimeCalled": False,
        },
    }


def _blocked_output(engine_input: dict[str, Any] | None, diagnostics: list[dict]) -> dict[str, Any]:
    return {
        "schemaVersion": ENGINE_OUTPUT_SCHEMA_VERSION,
        "engine": "python",
        "engineVersion": "p11.0",
        "status": _status_from_diagnostics(diagnostics),
        "chapter2": {"status": "blocked", "annual": {}, "monthly": []},
        "chapter3": {"status": "blocked"},
        "chapter4": {"status": "not_requested"},
        "energyCarriers": {},
        "diagnostics": diagnostics,
        "executionTrace": [],
        "provenance": {
            "engineInput": engine_input.get("schemaVersion") if isinstance(engine_input, dict) else None,
            "javascriptRuntimeCalled": False,
        },
    }


def calculate(engine_input: dict[str, Any]) -> dict[str, Any]:
    start = time.perf_counter()
    diagnostics = validate_engine_input(engine_input)
    if diagnostics:
        return _blocked_output(engine_input, diagnostics)

    dialect = engine_input.get("calculationOptions", {}).get("inputDialect")
    if dialect == "p3v_reference_fixture_v1":
        result = _calculate_reference_fixture(engine_input)
    else:
        result = _blocked_output(
            engine_input,
            [diagnostic(
                UNSUPPORTED_ENGINE_INPUT_DIALECT,
                f"Unsupported calculation input dialect: {dialect}",
                path="calculationOptions.inputDialect",
            )],
        )
    result["performance"] = {
        "runtimeMs": round((time.perf_counter() - start) * 1000, 3)
    }
    return result


def load_engine_input(path: str | Path) -> dict[str, Any]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("schemaVersion") == "p3v.fixture.v1" or "fixture_id" in data:
        return build_engine_input_from_p3v_fixture(data)
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the LaCurent Python engine on a JSON engine input.")
    parser.add_argument("input", help="Engine input JSON or P3V fixture JSON")
    args = parser.parse_args(argv)
    try:
        result = calculate(load_engine_input(args.input))
    except Exception as error:  # Expected domain blockers are diagnostics; this is development failure.
        print(json.dumps({
            "schemaVersion": ENGINE_OUTPUT_SCHEMA_VERSION,
            "engine": "python",
            "status": "error",
            "error": type(error).__name__,
            "message": str(error),
        }, indent=2, sort_keys=True), file=sys.stdout)
        return 1
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] in {"ready", "incomplete"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
