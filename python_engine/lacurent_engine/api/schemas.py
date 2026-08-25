"""Versioned Python engine input/output contract."""

from __future__ import annotations

import copy
from typing import Any

from ..core.validation import reject_non_finite, require_sections

ENGINE_INPUT_SCHEMA_VERSION = "lacurent_engine_input_v1"
ENGINE_OUTPUT_SCHEMA_VERSION = "lacurent_engine_output_v1"

REQUIRED_ENGINE_INPUT_SECTIONS = [
    "schemaVersion",
    "building",
    "climate",
    "envelope",
    "use",
    "systems",
    "renewables",
    "calculationOptions",
]


def build_engine_input_from_p3v_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    """Create the stable engine contract from an independent P3V fixture.

    This adapter is for validation and differential testing.  The fixture
    remains canonical input data; no JavaScript output or UI state is imported.
    """
    return {
        "schemaVersion": ENGINE_INPUT_SCHEMA_VERSION,
        "building": {
            "buildingId": fixture["fixture_id"],
            "description": fixture.get("description"),
            "profileStatus": fixture.get("fixture_status"),
        },
        "climate": {
            "profileProvenance": copy.deepcopy(fixture.get("profile_provenance", {})),
            "monthly": [
                {
                    "month": month["month"],
                    "durationHours": month["duration_hours"],
                    "outdoorTemperatureC": month["outdoor_temperature_c"],
                }
                for month in fixture.get("monthly", [])
            ],
        },
        "envelope": {
            "materials": copy.deepcopy(fixture.get("materials", {})),
            "assemblies": copy.deepcopy(fixture.get("assemblies", [])),
            "elements": copy.deepcopy(fixture.get("envelope", {}).get("elements", [])),
            "linearBridges": copy.deepcopy(fixture.get("envelope", {}).get("linear_bridges", [])),
            "pointBridges": copy.deepcopy(fixture.get("envelope", {}).get("point_bridges", [])),
        },
        "use": {
            "utilization": copy.deepcopy(fixture.get("utilization", {})),
            "monthly": copy.deepcopy(fixture.get("monthly", [])),
        },
        "systems": copy.deepcopy(fixture.get("systems", {})),
        "renewables": copy.deepcopy(fixture.get("renewables", {})),
        "calculationOptions": {
            "inputDialect": "p3v_reference_fixture_v1",
            "supportedScopes": ["chapter2_supported", "chapter3_non_lighting_supported", "chapter4_pv_supported"],
            "preserveSolarBlocker": True,
        },
        "_referenceFixture": copy.deepcopy(fixture),
    }


def validate_engine_input(value: dict[str, Any]) -> list[dict]:
    diagnostics = []
    if not isinstance(value, dict):
        return [{
            "code": "INVALID_ENGINE_INPUT",
            "severity": "blocking",
            "message": "Engine input must be a JSON object.",
            "path": "$",
        }]
    diagnostics.extend(require_sections(value, REQUIRED_ENGINE_INPUT_SECTIONS))
    diagnostics.extend(reject_non_finite(value))
    if value.get("schemaVersion") != ENGINE_INPUT_SCHEMA_VERSION:
        diagnostics.append({
            "code": "UNSUPPORTED_ENGINE_INPUT_SCHEMA",
            "severity": "blocking",
            "message": f"Expected schemaVersion {ENGINE_INPUT_SCHEMA_VERSION}.",
            "path": "schemaVersion",
        })
    return diagnostics
