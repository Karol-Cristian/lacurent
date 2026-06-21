# Physics Engine Legacy Inventory

## Scope

This inventory marks the current energy calculation code as legacy input for a controlled rebuild.

No files are deleted in this step. The labels below mean:

- `KEEP`: safe to keep temporarily as reference, registry, test, or production fallback.
- `MIGRATE`: useful logic exists, but it should move into `physics-v1` with clearer boundaries.
- `REWRITE`: concept is useful, but implementation is too mixed or too heuristic to carry forward directly.
- `DELETE_LATER`: candidate for removal only after v1 has coverage and production fallback.

## Main Flow Files

| File | Current role | Calculates / owns | Inline values | Registries used | Main flow? | Temporary status | v1 action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `workers/save-house.js` | Production API, DB persistence, report assembly, physics orchestration and several inline calculators | geometry approximation, envelope U/H, ventilation, demand handoff, systems, primary/CO2, classes, report snapshot | many: HDD 3200/3400, ACH 0.75, R layers, U defaults, system efficiencies, prices, cost splits | some v0 registries through imported calculators; also inline maps | yes | KEEP as production legacy orchestrator | MIGRATE formulas out; leave as orchestrator only |
| `workers/energy-model.js` | Legacy worker-side user input mapping and recommendation model | profile derivation, DHW source mapping, recommendations, energy score style logic | many defaults and heuristics | mostly local maps | partial / legacy | KEEP until confirmed unused | REWRITE/MIGRATE only input normalization pieces |
| `js/report-v1.js` | Public report renderer | should render only; currently maps some energy carriers and estimates utility primary/CO2 from carrier aggregates | UI fallback values and demo fallbacks | API result only | yes, UI | KEEP; no v1 changes now | ensure it never calculates physics |
| `pages/raport-energie.html`, `pages/raport-v1.html` | Public report pages | display only | none significant, but page scripts assemble visible values | JS result | yes, UI | KEEP | no calculator logic in UI |

## Legacy Physics Calculators

| File / group | Current role | Notes | Temporary status | v1 action |
| --- | --- | --- | --- | --- |
| `src/features/energy/physics/calculators/resistance.ts` | R layer / R total helpers | useful pure pieces exist | KEEP | MIGRATE after trace/unit contract is stable |
| `src/features/energy/physics/calculators/transmittance.ts` | U = 1/R | useful pure piece | KEEP | MIGRATE |
| `src/features/energy/physics/calculators/correctedTransmittance.ts` | U corrected with bridges | useful concept | KEEP | MIGRATE with explicit bridge trace |
| `src/features/energy/physics/calculators/thermalBridgeLoss.ts` | bridge H losses | useful concept | KEEP | MIGRATE |
| `src/features/energy/physics/calculators/transmissionHeatTransfer.ts`, `transmissionHeatTransferV02.ts` | Htr | likely duplicate V02/current flows | KEEP | MIGRATE one canonical version |
| `src/features/energy/physics/calculators/ventilationHeatTransfer.ts`, `ventilationV02.ts` | Hve | duplicate formulas and fallback handling | KEEP | MIGRATE one canonical version |
| `src/features/energy/physics/calculators/heatingDemand.ts`, `heatingDemandMonthly.ts` | annual/monthly heating useful demand | useful but mixed stage versions | KEEP | MIGRATE by stage after geometry/envelope |
| `src/features/energy/physics/calculators/coolingDemandMonthly.ts` | simplified cooling demand | lower confidence | KEEP | MIGRATE later |
| `src/features/energy/physics/calculators/internalGains.ts`, `solarGains.ts`, `heatBalance.ts`, `utilizationFactors.ts` | gains and monthly balance | useful but needs registry cleanup | KEEP | MIGRATE after Htr/Hve |
| `src/features/energy/physics/calculators/systemsLayerV04.ts`, `heatingSystemLosses.ts`, `dhwSystemLosses.ts`, `coolingSystemConsumption.ts`, `auxiliaryEnergy.ts`, `finalEnergy.ts` | final energy and systems | several useful pieces, but system defaults need central truth | KEEP | MIGRATE after useful demand |
| `src/features/energy/physics/calculators/primaryEnergy.ts`, `co2.ts`, `referenceValues.ts/.mjs`, `carrierMapping.ts/.mjs` | primary/CO2 factors and carrier mapping | recently improved; still belongs in v1 registry/calculator boundary | KEEP | MIGRATE after final energy |
| `src/features/energy/physics/calculators/estimatedEnergyClass.ts/.mjs`, `classifyEnergyPerformance.ts/.mjs`, `classification.ts` | classification | current cleanest part, but still in old namespace | KEEP | MIGRATE after v1 primary energy |
| `src/features/energy/physics/calculators/auditScenario.ts`, `auditScenarios.ts` | scenarios / audit comparison | out of v1 Stage 1 scope | KEEP as legacy | MIGRATE only after baseline engine is stable |
| `src/features/energy/physics/calculators/lightingDemand.ts`, `dhwDemand.ts`, `annualDemand.ts`, `monthlyClimate.ts` | supporting demands | useful but needs v1 trace contract | KEEP | MIGRATE in later stages |

## Legacy Engine Files

| File | Current role | Issue | Temporary status | v1 action |
| --- | --- | --- | --- | --- |
| `src/features/energy/physics/engine/buildPhysicalModel.ts` | builds physical model | contains assumptions and default systems | KEEP | REWRITE around explicit v1 input contracts |
| `src/features/energy/physics/engine/runEnergySimulation.ts` | older full simulation | parallel path vs newer staged layers | KEEP | DELETE_LATER after v1 parity |
| `src/features/energy/physics/engine/runEnvelopeLayerV02.ts` | envelope stage | useful as migration reference | KEEP | MIGRATE |
| `src/features/energy/physics/engine/runEnergyDemandLayerV03.ts` | demand stage | useful as migration reference | KEEP | MIGRATE |
| `src/features/energy/physics/engine/runSystemsLayerV04.ts` | systems stage | useful as migration reference | KEEP | MIGRATE |
| `src/features/energy/physics/engine/generateEnergyResult.ts` | result aggregation | older result shape | KEEP | REWRITE for v1 result contract |
| `src/features/energy/physics/engine/buildEnergyAuditResult.ts` | audit result assembly | beyond baseline engine | KEEP | MIGRATE later |
| `src/features/energy/physics/engine/criticalMc001Chain.ts` | validation chain for critical formulas | valuable validation reference | KEEP | MIGRATE validation cases |
| `src/features/energy/physics/engine/demoEnvelopeV02.ts` | demo fixture/model | not valid for future validation | KEEP only as UI/demo artifact | DO NOT USE for v1 validation |

## Registries and Parameters

| File / group | Current role | Issue | Temporary status | v1 action |
| --- | --- | --- | --- | --- |
| `materials.registry.ts`, `windows.registry.ts`, `surfaceResistances.registry.ts`, `thermalBridges.registry.ts` | envelope constants | useful but source/confidence consistency varies | KEEP | MIGRATE with source metadata |
| `monthlyClimate.registry.ts`, `climate.registry.ts`, `solarRadiation.registry.ts`, `occupancyProfiles.registry.ts`, `internalGains.registry.ts` | climate/gains defaults | several internal estimates | KEEP | MIGRATE after geometry/envelope |
| `heatingSystemPresets.registry.ts`, `generationEfficiencyPresets.registry.ts`, `distributionEfficiencyPresets.registry.ts`, `emissionEfficiencyPresets.registry.ts`, `storageEfficiencyPresets.registry.ts`, `controlEfficiencyPresets.registry.ts`, `coolingSystemPresets.registry.ts`, `dhwSystemPresets.registry.ts`, `auxiliaryEnergyPresets.registry.ts` | system presets | duplicate concepts and unverified estimates | KEEP | MIGRATE with user-approved sources |
| `primaryEnergyFactors.registry.ts/.mjs`, `co2Factors.registry.ts/.mjs`, `energyClassThresholds.registry.ts/.mjs` | MC001-like user-provided values | relatively clean | KEEP | MIGRATE after v1 final energy |
| `primaryEnergyFactorsV05.registry.ts`, `co2EmissionFactors.registry.ts`, `classThresholds.registry.ts`, `energyClassThresholdsV05.registry.ts` | older/parallel factors and thresholds | duplicate source-of-truth risk | KEEP temporarily | DELETE_LATER after replacement |
| `referenceEnvelopeValues.registry.ts/.mjs`, `referenceBuildingRules.registry.ts/.mjs`, `referenceBuilding.registry.ts`, `referenceValues.registry.ts` | reference building candidates | incomplete normative set | KEEP | MIGRATE only after missing values confirmed |
| `physics/parameters/*.json`, `parameters/README.md` | MC001 parameter vocabulary | useful documentation/trace vocabulary | KEEP | MIGRATE references into v1 docs/trace metadata |

## Tests and Validation

| File / group | Current role | Notes | Temporary status | v1 action |
| --- | --- | --- | --- | --- |
| `tests/physics-*.mjs` | regression coverage for old engine | valuable but mixes exact and directional tests | KEEP | add v1 tests separately |
| `src/features/energy/physics/validation/*` | formula validation harness | useful for trace expectations | KEEP | migrate formula cases after v1 Stage 2+ |
| `src/features/energy/physics/test-fixtures/referenceHomes.ts` | synthetic A-G reference homes | internal regression only, not real DB validation | KEEP as internal synthetic | do not use as real validation |

## Mixed UI / DB / Formula Areas

1. `workers/save-house.js`
   - DB handlers, auth, admin access, report assembly and physics calculations coexist.
   - Inline geometry/envelope/system defaults are close to persistence logic.
   - v1 goal: worker calls engine and persists/returns results only.

2. `js/report-v1.js`
   - Mostly display, but still derives some carrier factors from aggregates for utility rows.
   - v1 goal: report consumes already-classified, already-allocated API output.

3. `workers/energy-model.js`
   - User input normalization, recommendations and simplified energy assumptions are mixed.
   - v1 goal: extract only input normalization contracts if still needed.

4. `src/features/energy/physics/engine/buildPhysicalModel.ts`
   - Model construction and default assumptions are mixed.
   - v1 goal: separate input normalization from physics stages.

## Duplicate or Contradictory Functions / Concepts

- Primary energy factors:
  - `primaryEnergyFactors.registry.ts/.mjs`
  - `primaryEnergyFactorsV05.registry.ts`
  - older inline or internal estimates in legacy code.

- CO2 factors:
  - `co2Factors.registry.ts/.mjs`
  - `co2EmissionFactors.registry.ts`
  - older inline/internal estimates.

- Class thresholds:
  - `energyClassThresholds.registry.ts/.mjs`
  - `energyClassThresholdsV05.registry.ts`
  - `classThresholds.registry.ts`.

- Ventilation:
  - `ventilationHeatTransfer.ts`
  - `ventilationV02.ts`
  - worker inline `0.34 * airflow * (1 - recovery)`.

- Transmission / Htr:
  - `transmissionHeatTransfer.ts`
  - `transmissionHeatTransferV02.ts`
  - worker inline `element.u * element.area`.

- Systems and final energy:
  - `systemsLayerV04.ts`
  - worker inline `SYSTEM_V04_PRESETS`
  - older `runEnergySimulation.ts`.

- Geometry:
  - worker approximates walls/footprint from square footprint.
  - `buildPhysicalModel.ts` has model defaults.
  - v1 Stage 1 explicitly avoids footprint/envelope derivation.

## Normative Constants Without Clear Source or Not Ready for v1

- `workers/save-house.js`: `3200/3400 HDD`, `0.75 ACH`, `2.5 m`, wall/window/roof U defaults, `0.55` wood stove efficiency, system efficiencies, prices.
- `workers/energy-model.js`: legacy scoring and input defaults.
- `physics/calculators/ventilationV02.ts`: ACH fallback `0.7`.
- `physics/registries/*Efficiency*`: many values marked `internal_estimate`.
- `physics/registries/monthlyClimate.registry.ts`: internal climate estimates.
- `physics/registries/primaryEnergyFactorsV05.registry.ts`: older placeholder factors.

## Implicit or Ambiguous Units

- `normalizeEmail` and raw form values can carry text like `10cm`, `Da`, `Nu`; unit conversion happens near worker logic.
- Worker values often round to integers before attaching `physicsValue`.
- `finalEnergyByUse` and `finalEnergyByCarrier` are both kWh/year, but UI sometimes infers factors from totals.
- Some class thresholds use `kWh/m2.year`; older files use `kWh/m2/an` text.
- `0.34` ventilation constant is used as Wh/(m3K), but not always represented as a registry value.

## Keep / Migrate / Rewrite Summary

KEEP temporarily:

- current worker production flow;
- current physics tests;
- current registries with source metadata;
- current report UI as consumer only.

MIGRATE:

- pure formulas for R, U, U corrected, Htr, Hve, QH, final energy, primary energy, CO2, classes;
- registries with source/confidence metadata;
- calculation trace patterns;
- carrier mapping.

REWRITE:

- worker inline physics;
- model construction with implicit defaults;
- reference building builder;
- UI-derived carrier/utility estimates;
- duplicate V02/V03/V04 orchestration into one staged v1 pipeline.

DELETE_LATER:

- duplicate old registries and calculators after v1 parity;
- synthetic/demo validation paths from production validation;
- obsolete engine entrypoints after endpoint fallback is proven.

## First Minimal PR Proposal

1. Add this inventory.
2. Add `docs/PHYSICS_ENGINE_V1_PLAN.md`.
3. Add `src/features/energy/physics-v1/` skeleton.
4. Add v1 minimum model types.
5. Add Stage 1 `normalizeGeometry`.
6. Add Stage 1 tests.
7. Do not connect v1 to production.
8. Do not delete legacy code.
