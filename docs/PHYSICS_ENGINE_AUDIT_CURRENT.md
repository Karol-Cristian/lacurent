# Physics Engine Audit Current

Data: 2026-06-05

Scope: audit tehnic al lantului LaCurent Physics Engine. Nu include UI, marketplace, buyer mode, AI cards sau recomandari comerciale.

## 1. Current calculation chain

Exista trei trasee diferite care trebuie tinute separate:

1. Production worker chain
   - `workers/save-house.js`
   - Este traseul folosit de API si de datele afisate in produs.
   - Lant:
     - DB/input brut
     - `safeBuildPhysicalEnergyResult(rawInput)`
     - `buildPhysicalEnergyResult(rawInput)`
     - derivare geometrie si arii
     - estimare U pe elemente
     - H transmisie, punti termice simplificate, H ventilatie
     - `buildEnergyDemandV03`
     - `buildSystemsLayerV04`
     - `buildPrimaryEnergyAndCo2V05`
     - `buildClassificationV06`

2. Modular TypeScript chain
   - `src/features/energy/physics/engine/buildPhysicalModel.ts`
   - `src/features/energy/physics/engine/runEnergySimulation.ts`
   - `src/features/energy/physics/engine/runEnvelopePhysicsV02.ts`
   - Este mai curat structural, dar nu pare sa fie singura sursa de adevar pentru productia curenta.

3. Traceable critical chain
   - `src/features/energy/physics/engine/criticalMc001Chain.mjs`
   - Este cel mai apropiat de cerinta CalculationTrace pe formule atomice.
   - Include R, U, U corrected, Htr, Hve, QH,nd, final heating energy, primary energy, CO2 si class.
   - Nu este acelasi lant cu worker-ul de productie.

## 2. Files inspected

- `workers/save-house.js`
- `src/features/energy/physics/engine/buildPhysicalModel.ts`
- `src/features/energy/physics/engine/runEnergySimulation.ts`
- `src/features/energy/physics/engine/runEnvelopePhysicsV02.ts`
- `src/features/energy/physics/engine/criticalMc001Chain.mjs`
- `src/features/energy/physics/model/CalculationTrace.ts`
- `src/features/energy/physics/calculators/resistance.ts`
- `src/features/energy/physics/calculators/envelopeV02.ts`
- `src/features/energy/physics/calculators/correctedTransmittance.ts`
- `src/features/energy/physics/calculators/transmissionHeatTransfer.ts`
- `src/features/energy/physics/calculators/ventilationV02.ts`
- `src/features/energy/physics/calculators/ventilationHeatTransfer.ts`
- `src/features/energy/physics/calculators/heatingDemand.ts`
- `src/features/energy/physics/calculators/heatingDemandV02.ts`
- `src/features/energy/physics/calculators/systemsLayerV04.ts`
- `src/features/energy/physics/calculators/primaryEnergyAndCo2V05.ts`
- `src/features/energy/physics/calculators/estimatedEnergyClass.ts`
- `src/features/energy/physics/calculators/referenceValues.ts`
- `src/features/energy/physics/registries/formulaRegistry.ts`
- `src/features/energy/physics/registries/primaryEnergyFactors.registry.ts`
- `src/features/energy/physics/registries/co2Factors.registry.ts`
- `src/features/energy/physics/registries/referenceEnvelopeValues.registry.ts`
- `src/features/energy/physics/registries/referenceBuildingRules.registry.ts`
- `package.json`

## 3. Existing formulas

Implemented in at least one engine path:

| Formula | Status | Main files |
| --- | --- | --- |
| `R_layer = d / lambda` | implemented | `resistance.ts`, `envelopeV02.ts`, `criticalMc001Chain.mjs` |
| `R_total = Rsi + sum(R_layer) + Rse` | implemented | `resistance.ts`, `envelopeV02.ts`, `criticalMc001Chain.mjs` |
| `U = 1 / R_total` | implemented | `transmittance.ts`, `envelopeV02.ts`, `criticalMc001Chain.mjs` |
| `H_tb = sum(psi x length)` | implemented simplified | `envelopeV02.ts`, `thermalBridgeLoss.ts`, `criticalMc001Chain.mjs` |
| `U_corrected = (U x A + H_tb) / A` | implemented in trace/envelope v02 | `envelopeV02.ts`, `criticalMc001Chain.mjs` |
| `H_element = U_corrected x A` | implemented | `transmissionHeatTransfer.ts`, `envelopeV02.ts`, `criticalMc001Chain.mjs` |
| `Htr = sum(H_elements_corrected)` | implemented | `transmissionHeatTransfer.ts`, `envelopeV02.ts`, `criticalMc001Chain.mjs` |
| `airflowM3h = ACH x heatedVolumeM3` | implemented | `ventilationV02.ts`, `ventilationHeatTransfer.ts`, `criticalMc001Chain.mjs` |
| `Hve = 0.34 x airflow x (1 - heatRecoveryEfficiency)` | implemented | `ventilationV02.ts`, `ventilationHeatTransfer.ts`, `criticalMc001Chain.mjs` |
| `QH,nd = (Htr + Hve) x HDD x 24 / 1000` | implemented in v02/critical chain | `heatingDemandV02.ts`, `criticalMc001Chain.mjs` |
| Monthly heat balance with gains | implemented simplified | `workers/save-house.js`, `runEnergyDemandV03.ts` |
| `finalEnergy = usefulDemand / efficiency` | implemented | `systemsLayerV04.ts`, `workers/save-house.js`, `criticalMc001Chain.mjs` |
| `primaryEnergy = finalEnergy x primaryEnergyFactor` | implemented | `primaryEnergyAndCo2V05.ts`, `workers/save-house.js`, `criticalMc001Chain.mjs` |
| `CO2 = finalEnergy x co2Factor` | implemented | `primaryEnergyAndCo2V05.ts`, `workers/save-house.js`, `criticalMc001Chain.mjs` |
| Estimated class from primary kWh/m2.year | implemented | `estimatedEnergyClass.ts`, `workers/save-house.js` |

## 4. Existing registries

Registries already present:

- Materials: `materials.registry.ts`
- Surface resistances: `surfaceResistances.registry.ts`
- Windows: `windows.registry.ts`
- Climate: `climate.registry.ts`, `monthlyClimate.registry.ts`
- Heating systems/fuels: `heatingSystems.registry.ts`, `heatingSystemPresets.registry.ts`, `fuels.registry.ts`
- System efficiency presets: emission, distribution, storage, generation, control, auxiliary registries
- Formula registry: `formulaRegistry.ts`
- Estimated class thresholds: `energyClassThresholds.registry.ts`
- MC001-like reference envelope values: `referenceEnvelopeValues.registry.ts`
- MC001-like reference building rules: `referenceBuildingRules.registry.ts`
- MC001-like primary factors from user-provided values: `primaryEnergyFactors.registry.ts`
- MC001-like CO2 factors from user-provided values: `co2Factors.registry.ts`

Important mismatch:

- The production worker still contains inline `PRIMARY_FACTORS_V05`, `SYSTEM_V04_PRESETS` and class threshold sets.
- The new MC001-like registries are not clearly the source used by the production worker.

## 5. Existing assumptions

Production worker assumptions:

- Heated area fallback: `heated_area_m2 || useful_area_m2 || surface || 65`.
- Number of floors fallback: `1`.
- Floor height fallback: `2.5 m`.
- Heated volume: `area x height`.
- Footprint: `area / floors`.
- Wall gross area: square-footprint approximation.
- Window area fallback: `15%` of heated area.
- Door area fallback: `2.2 m2`.
- Thermal bridges: `perimeter x 0.25 W/mK`.
- Natural ventilation fallback: `ACH = 0.75`.
- Mechanical ventilation fallback: `ACH = 0.5`.
- Roof insulation fallback in worker: `0.06 m`.
- Floor-on-ground model uses simplified equivalent soil/factor.
- Monthly energy demand uses internal estimated climate and gains.
- DHW useful demand fallback: occupants or `area / 32`.
- Cooling SEER fallback in worker: `3.1`.

## 6. Existing warnings

Warnings currently exist but are uneven:

- `classifyEstimatedEnergyClass` warns for missing primary energy, missing building type, invalid value and negative value.
- `buildClassificationV06` adds:
  - `TODO_CO2_ENVIRONMENTAL_CLASS_REGISTRY_MISSING`
  - `PRIMARY_ENERGY_FACTORS_REQUIRE_OFFICIAL_VALIDATION`
- `safeBuildPhysicalEnergyResult` silently catches physics errors and returns `null`.
- Traceable helper functions include warnings for declared U-values and simplified QH,nd.

Missing or weak warnings:

- Production worker does not emit explicit warnings for fallback area, height, floors, window area, door area, roof insulation or ACH.
- Production worker does not warn when inline factors differ from MC001-like registries.
- Production worker does not expose missing `CalculationTrace`.

## 7. Missing traces

The `CalculationTrace` model exists, but production worker results do not consistently include traces.

Missing or partial trace coverage in production path:

- R layer
- R total
- U
- U corrected
- H element
- H thermal bridges
- Htr
- airflow
- Hve
- QH,nd / monthly heating demand
- final heating energy
- final DHW energy
- total final energy
- primary energy by carrier
- total primary energy
- CO2 by carrier
- total CO2
- estimated energy class

The traceable chain `criticalMc001Chain.mjs` covers most of these, but it is not the production chain.

## 8. Missing units

Most numeric outputs have units, but metadata is inconsistent.

Issues:

- `CalculationTrace` lacks explicit `formulaText`, `source` and `sourceType`, although the prompt wants them.
- Worker `physicsValue` style values usually include `unit`, `source` and `confidence`, but not full trace inputs/steps/warnings.
- Unit strings vary:
  - `kWh/an`
  - `kWh/year`
  - `kWh/m2/an`
  - `kWh/m2.year`
- The coefficient `0.34` is used as a constant but its unit `Wh/(m3K)` is not always explicit.
- Class thresholds use `kWh/m2.year`, while report-facing values may use `kWh/m2/an`.

## 9. Suspicious calculations

These are not fixed in this audit because they need a controlled follow-up:

1. Production primary/CO2 factors are inline and stale relative to new MC001-like registries.
   - Worker wood factor total is `0.25`.
   - New registry firewood total is `1.08`.
   - This can materially change primary energy and class.

2. Production `heatLossTransmission` excludes `thermalBridgeLoss`, but demand receives `hTransmission + hBridge`.
   - Displayed/transmitted Htr can differ from the H used in QH.
   - Need naming decision: `HtrEnvelopeOnly` vs `HtrIncludingThermalBridges`.

3. Several paths compute transmission differently.
   - `runEnergySimulation` uses `calculateTransmissionHeatTransfer(building.envelope)` plus separate `calculateThermalBridgeLoss(building.thermalBridges)`.
   - `runEnvelopePhysicsV02` uses `calculateTransmissionHeatTransfer(building)` from `envelopeV02.ts`.
   - Worker computes H directly inline.

4. `calculateLayerResistance` can return `0` for missing lambda/thickness.
   - This avoids crashes but can silently distort U.
   - Better behavior for strict validation: return warning and mark element incomplete.

5. Unconditioned zone correction fallback `0.85` is embedded in `envelopeV02.ts`.
   - Needs MC001-like registry/decision before strict reference comparison.

6. Cooling and internal gains use internal estimates.
   - Valid for prototype, not strict MC001 validation.

## 10. Bugs or strange behaviors

No code bug was fixed in this step.

Potential bugs/strange behavior to fix only after confirmation:

- Primary/CO2 factor source mismatch between worker and new registries.
- Duplicate estimated class threshold implementations in worker and TS registry.
- Htr naming ambiguity around thermal bridges.
- Missing explicit warnings for production fallbacks.
- Encoding fragility in strings used for Romanian building type matching in worker.

## 11. Recommended fixes, without new features

Recommended next fixes, still within Physics Engine scope:

1. Make one production numeric source of truth for primary and CO2 factors.
2. Decide whether production worker should import/generate from physics registries or keep a synced worker registry.
3. Standardize `CalculationTrace` fields with `formulaText`, `source` and `sourceType`.
4. Add trace wrappers to production calculations before changing formulas.
5. Rename Htr outputs so envelope-only and bridge-included values cannot be confused.
6. Replace silent fallback values with warnings and missing-input lists.
7. Add tests for production worker factor parity with registries.
8. Do not implement ReferenceBuildingBuilder until numeric reference system/ventilation/DHW values are confirmed.
