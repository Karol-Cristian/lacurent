# MC001-2022 Extraction Package

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

This folder splits MC001-2022 into implementation modules for LaCurent Physics Engine work.

This extraction is for LaCurent Physics Engine only. It is not for issuing official energy performance certificates and must not be used to claim official certification capability.

The split is by calculation module, not by equal PDF page ranges. A module should be small enough for AI/Codex implementation work and should contain only the formulas, definitions, inputs, outputs, warnings, and implementation implications needed for that part of the engine.

## Extraction Status

Each extraction file can use one of these statuses:

- `extracted` - content has been extracted and is ready to guide implementation.
- `needs_verification` - concept is extracted, but exact clause/page/table should be checked against the official PDF before calculator work.
- `not_for_implementation` - useful context, but not intended to drive code.
- `blocked_missing_values` - module needs official values, tables, or decisions before implementation.

## Implementation Rules

- Calculators must not use MC001 formulas unless those formulas are present in a reviewed extraction file.
- No value should be invented.
- If an input, coefficient, convention, or reference value is missing, the implementation must return a warning or blocked status instead of silently creating a fallback.
- Extraction files are not official certification logic. They are implementation guidance for an estimative MC001-like Physics Engine.
- A formula in this folder is allowed to become code only after its inputs, output, units, assumptions, and validation notes are clear.

## Module Map

| Module | Purpose | Status |
| --- | --- | --- |
| `00_scope_terminology_symbols` | Scope, terminology, symbols, and concepts needed by the Physics Engine. | `extracted` / `needs_verification` |
| `01_geometry_envelope_definitions` | Geometry and envelope definitions needed before R/U/H calculations. | `extracted` / `needs_verification` |
| `02_materials_lambda_R_U` | Material conductivity, layer resistance, total resistance, transmittance. | not extracted |
| `03_thermal_bridges` | Linear/point thermal bridges and corrected transfer. | not extracted |
| `04_minimum_envelope_requirements` | Minimum envelope/reference requirements and tables. | not extracted |
| `05_transmission_heat_transfer` | Transmission transfer coefficients and monthly transmission transfer. | not extracted |
| `06_ventilation_and_infiltration` | Ventilation, infiltration, airflow, heat recovery. | not extracted |
| `07_monthly_heating_cooling_demand` | Monthly heating/cooling demand, gains, utilization. | not extracted |
| `08_heating_systems` | Heating system generation, distribution, emission, control. | not extracted |
| `09_dhw_systems` | Domestic hot water demand and systems. | not extracted |
| `10_lighting` | Lighting energy. | not extracted |
| `11_cooling_ventilation_systems` | Cooling and ventilation systems. | not extracted |
| `12_renewables` | Renewables and exported energy. | not extracted |
| `13_final_primary_co2_rer` | Final energy, primary energy, CO2, renewable energy ratio. | not extracted |
| `14_reference_building` | Reference building rules and replacement values. | not extracted |
| `15_energy_classes_and_certificate` | Energy classes, certificate indicators, certificate fields. | not extracted |
| `16_audit_energy_measures` | Audit measures and renovation packages. | not extracted |
| `17_climate_annex` | Climate data and annex tables. | not extracted |
| `18_examples_and_breviars` | Examples, breviaries, and worked cases. | not extracted |
| `19_extraction_registry` | Index of extracted formulas, symbols, and reviewed implementation decisions. | not extracted |

## Current Package

This first package contains:

- `00_scope_terminology_symbols.md`
- `01_geometry_envelope_definitions.md`
- `NEXT_EXTRACTION_STEPS.md`

No calculators are implemented by this package.
