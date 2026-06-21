# Physics Engine v1 Plan

## Purpose

Physics Engine v1 is a controlled rebuild of the LaCurent energy calculator.

The goal is not to add product features. The goal is to isolate formulas, inputs, registries and traces so the energy model can be validated step by step.

## Core Rules

1. All calculators are pure functions.
2. No normative value is hardcoded in calculators.
3. Normative values live only in registries.
4. Every important result has:
   - `value`;
   - `unit`;
   - `formulaId`;
   - `inputs`;
   - `source`;
   - `assumptions`;
   - `warnings`;
   - `confidence`;
   - `trace`.
5. RealBuilding and ReferenceBuilding are separate models.
6. At the beginning, v1 implements only RealBuilding.
7. A complete ReferenceBuildingBuilder remains blocked until the missing normative values are supplied.
8. If a critical input is missing, v1 does not invent a silent value; it returns a warning.
9. Public UI does not calculate physics.
10. `workers/save-house.js` should become an orchestrator, not the place where formulas live.

## v1 Folder Contract

`src/features/energy/physics-v1/` is the clean-room namespace for the rebuild:

- `model/`: input/output model and shared types.
- `registries/`: normative/default values with source metadata.
- `calculators/`: pure formula calculators.
- `engine/`: orchestration only, no raw formula logic.
- `traces/`: trace helpers and trace validation.
- `validation/`: parity and MC001-like validation harnesses.
- `tests/`: v1-only unit tests.

Legacy code remains available as production fallback and migration reference until parity is proven.

## Stage Roadmap

### Stage 1 — Geometry Normalization

Input:
- `usefulAreaM2`;
- `heatedAreaM2`;
- `heatedVolumeM3`;
- `averageFloorHeightM`.

Output:
- normalized useful area;
- normalized heated area;
- normalized heated volume;
- warnings.

Rules:
- do not derive envelope areas;
- do not assume square footprint;
- use the user-provided volume when present;
- if volume is missing and height is present, calculate volume from heated area and height;
- if both volume and height are missing, use the explicit Stage 1 fallback height of 2.5 m and return a severe warning.

### Stage 2 — Envelope R/U

Input:
- envelope elements;
- material layers or direct U-values;
- surface resistance registry.

Output:
- `R_layer`;
- `R_total`;
- `U`;
- warnings.

Blocked by:
- registry cleanup for materials and surface resistances.

### Stage 3 — Transmission Heat Loss Htr

Input:
- U or corrected U;
- area;
- thermal bridge data.

Output:
- `H_element`;
- `Htr`.

Blocked by:
- canonical thermal bridge registry and correction rules.

### Stage 4 — Ventilation Heat Loss Hve

Input:
- ACH or airflow;
- heated volume;
- heat recovery efficiency.

Output:
- airflow;
- `Hve`.

Blocked by:
- explicit source of ACH or airflow for real homes.

### Stage 5 — Heating Useful Demand

Input:
- `Htr`;
- `Hve`;
- HDD.

Output:
- `QH,nd` in kWh/year;
- `QH,nd` in kWh/m2.year.

Blocked by:
- climate registry source selection and HDD trace.

### Stage 6 — Final Energy

Input:
- useful demand;
- seasonal efficiency or SCOP;
- carrier.

Output:
- final energy by carrier.

Blocked by:
- canonical system efficiency registry and carrier mapping.

### Stage 7 — Primary Energy + CO2

Input:
- final energy by carrier;
- primary energy factors;
- CO2 factors.

Output:
- primary energy;
- CO2 emissions.

Blocked by:
- migration of the existing MC001-like factor registries into v1.

### Stage 8 — Estimated Classes

Input:
- primary energy kWh/m2.year;
- building energy class type.

Output:
- estimated class;
- threshold trace.

Blocked by:
- v1 primary energy output and v1 threshold lookup.

### Stage 9 — ReferenceBuilding, Later

Blocked until we have:
- numeric reference ventilation values;
- reference heating efficiencies;
- reference DHW efficiencies;
- reference lighting numeric values;
- explicit handling of missing normative values.

ReferenceBuilding must copy geometry, climate and usage from RealBuilding, then replace envelope and system performance with reference registry values.

## First Minimal PR

The first minimal isolation step is:

1. Inventory legacy files and mark them as temporary legacy.
2. Create the `physics-v1` folder structure.
3. Define minimal v1 model types.
4. Implement only Stage 1 geometry normalization.
5. Add unit tests for Stage 1.
6. Keep v1 disconnected from production.

## Explicit Non-Goals For This Step

- no public UI changes;
- no DB schema changes;
- no endpoint removals;
- no ReferenceBuildingBuilder;
- no envelope, systems, primary energy, CO2 or class implementation in v1;
- no marketplace, buyer mode, lead flow, AI cards or report redesign.
