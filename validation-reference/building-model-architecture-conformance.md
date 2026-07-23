# P6B Production Architecture Simplification Report

Base: `origin/main` @ `66a2afd8b2c106b68c7fbf137d088182a990382f`

This milestone aligns the production calculator with the P6 Building Model Architecture without changing engineering behavior.

## Simplification

Removed from the production calculator UI:

- `building_length_m`
- `building_width_m`
- `thermal_mass_class`
- `wall_thickness`
- `wall_insulation_year`
- `roof_insulation_thickness_cm`
- `floor_insulation_thickness_cm`
- `window_age_years`
- `door_replaced`

These controls were visible but did not have canonical Building DNA ownership or a current physics-runtime consumer in the production path.

## Preserved Compatibility

The old Worker payload fields remain accepted where they already existed, only as legacy compatibility. They are not exposed by the canonical production calculator.

The hidden `climate_profile_id` remains bounded to demo and legacy compatibility. Locality plus the Climate Provider remain the production climate source of truth.

Legacy persistence tables remain migration/reopen boundaries and are not the canonical new write path.

## Architecture Conformance

- Climate profile owner: Romanian Climate Provider.
- Production geometry owner: Building DNA Resolver.
- Chapter 2 and Chapter 3 calculation owner: Physics Engine.
- Report/notebook calculation values owner: Technical Report Builder reading engine output.
- UI responsibility: collect primitive inputs and display provider/runtime/report results without duplicating formulas.

## Deferred Items

- `buildingSpecificParameters` and `geometry` still duplicate some values intentionally for reopen/fingerprint compatibility.
- Legacy Worker payload support remains until migration evidence proves removal is safe.
- Thermal-mass UI must not return until source-backed Building DNA and runtime semantics exist.

## Validation

Passed:

- `node --check tools/generate-building-model-architecture.mjs`
- `node tools/generate-building-model-architecture.mjs`
- `node --check tests/building-model-architecture-registry.mjs`
- `node tests/building-model-architecture-registry.mjs`
- `node tests/building-platform-wizard-ui.mjs`
- `npm.cmd run build`
- `npm.cmd run test:physics`
- `npm.cmd run test:mc001`
- `npm.cmd run test:p3v`
- all `src/building-platform/tests/*.mjs`
- all `workers/tests/*.mjs`
- `node tests/physics-source-of-truth-parity.mjs`
- `node tests/physics-reference-registries.mjs`
- `node tests/smoke.mjs` with local static server at `127.0.0.1:4173`

No Chapter 2 formulas, Chapter 3 formulas, physics algorithms, normative registries, report calculations, notebook calculations or numerical oracles were modified.
