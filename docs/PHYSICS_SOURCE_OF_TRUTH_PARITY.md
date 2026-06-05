# Physics Source Of Truth Parity

Data: 2026-06-05

Scope: etapa 1 de unificare surse de adevar pentru LaCurent Physics Engine. Nu include UI, marketplace, buyer mode, raport nou sau ReferenceBuildingBuilder.

## Summary

Obiectivul acestei etape este sa eliminam riscul ca aceleasi valori sa fie calculate diferit in worker, registries si calculators.

Schimbare aplicata acum:

- Primary energy factors: source of truth este registry-ul `primaryEnergyFactors.registry`.
- CO2 factors: source of truth este registry-ul `co2Factors.registry`.
- Energy class thresholds: source of truth este `energyClassThresholds.registry` via `classifyEstimatedEnergyClass`.
- Carrier mapping: source of truth nou este `carrierMapping`.
- Worker-ul nu mai contine tabele inline pentru primary factors, CO2 factors sau class thresholds.

## Parity table

| Area | Calculated now in | Inline in worker? | Separate registry? | Separate calculator? | Duplicate? | Source of truth selected | Code that must consume registry | Missing tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rsi/Rse | `resistance.ts`, `envelopeV02.ts`, worker inline element U path | partially | `surfaceResistances.registry.ts` | yes | yes | `surfaceResistances.registry.ts` | worker `elementU` and all resistance calculators | worker-vs-registry Rsi/Rse parity |
| material lambda | `materials.registry.ts`, worker material table/path | partially | `materials.registry.ts` | yes | likely | `materials.registry.ts` | worker material lookup and TS calculators | material lambda parity worker/registry |
| U / U corrected | `envelopeV02.ts`, `transmissionHeatTransfer.ts`, worker inline | yes | no U registry, but material/window registries | yes | yes | calculators + registries for material/window inputs | worker envelope path | production U trace tests |
| thermal bridge psi | `envelopeV02.ts`, worker perimeter x 0.25 | yes | `thermalBridges.registry.ts` exists | yes | yes | `thermalBridges.registry.ts` after user confirms values | worker thermal bridge path | psi parity and missing-bridge warning tests |
| Htr | `transmissionHeatTransfer.ts`, `envelopeV02.ts`, worker inline | yes | no | yes | yes | calculator should be source, but not refactored yet | worker `buildPhysicalEnergyResult` | Htr includes/excludes bridge naming test |
| Hve | `ventilationV02.ts`, `ventilationHeatTransfer.ts`, worker inline | yes | no complete ACH registry | yes | yes | ventilation calculator after ACH defaults confirmed | worker ventilation path | airflow/Hve trace tests |
| QH,nd | `heatingDemandV02.ts`, worker monthly v03, critical chain | yes | climate registries | yes | yes | not selected yet; needs user decision: annual HDD vs monthly balance | worker demand path | method selection/parity tests |
| system efficiency | `systemsLayerV04.ts`, worker `SYSTEM_V04_PRESETS` | yes | subsystem registries exist | yes | yes | subsystem registries after values confirmed | worker systems layer | preset parity tests |
| carrier mapping | worker preset carrier and ad hoc strings | partially | now `carrierMapping` | yes | reduced | `carrierMapping` | worker v04/v05 | added in `physics-source-of-truth-parity.mjs` |
| primary energy factors | worker inline `PRIMARY_FACTORS_V05` before this step | removed | `primaryEnergyFactors.registry` | `getPrimaryEnergyFactor` | fixed for worker | `getPrimaryEnergyFactor` | worker v05 | added |
| CO2 factors | worker inline with primary factors before this step | removed | `co2Factors.registry` | `getCo2Factor` | fixed for worker | `getCo2Factor` | worker v05 | added |
| energy class thresholds | worker inline threshold sets before this step | removed | `energyClassThresholds.registry` | `classifyEstimatedEnergyClass` | fixed for worker | `classifyEstimatedEnergyClass` | worker v06 | boundary tests already exist; parity test added |

## Primary energy factor behavior

Before:

- Worker used `PRIMARY_FACTORS_V05` inline.
- Values differed from the MC001-like registry.
- Missing carriers fell through old fallback behavior in some paths.

After:

- Worker calls `getPrimaryEnergyFactor(mappedCarrier)`.
- Carrier mapping is done by `resolveMc001Carrier`.
- Missing primary factor returns warning, not invented fallback.
- If primary factor is missing for a positive final-energy carrier, class calculation is blocked by `cannot_classify`.

## CO2 factor behavior

Before:

- Worker used CO2 factors embedded inside `PRIMARY_FACTORS_V05`.

After:

- Worker calls `getCo2Factor(mappedCarrier)`.
- Missing CO2 factor returns warning.
- CO2 factor details are stored separately so existing report consumers still receive numeric `co2ByCarrierKgYear`.

## Energy class behavior

Before:

- Worker had its own threshold arrays.
- TS calculator had registry-backed thresholds.

After:

- Worker calls `classifyEstimatedEnergyClassFromRegistry(primaryM2, buildingEnergyClassType)`.
- Boundary rules remain:
  - upper boundary belongs to the better class.
  - e.g. individual `91 => A+`, `91.01 => A`.
- If primary energy cannot be trusted because primary factor is missing, class returns unknown/cannot classify instead of fake A+ from zero.

## CalculationTrace additions

Primary energy, CO2 and class now have trace fields with:

- `formulaId`
- `formulaText`
- `inputs`
- `steps`
- `value`
- `unit`
- `source`
- `sourceType`
- `assumptions`
- `warnings`
- `confidence`

Worker v05 also emits carrier-level traces:

- `RESOLVE_MC001_CARRIER`
- `GET_PRIMARY_ENERGY_FACTOR`
- `PRIMARY_ENERGY_BY_CARRIER`
- `GET_CO2_FACTOR`
- `CO2_BY_CARRIER`

Worker v06 emits:

- `ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY`

## Remaining duplicate risks

Not fixed in this step:

- Rsi/Rse still need worker parity with `surfaceResistances.registry`.
- Material lambda lookup still needs worker parity with `materials.registry`.
- U corrected / Htr has multiple implementations and naming ambiguity around thermal bridges.
- Hve still has inline fallback ACH in worker.
- QH,nd has annual HDD and monthly-balance paths; production method must be explicitly selected.
- System efficiencies still have worker `SYSTEM_V04_PRESETS` duplicate values.

These need separate, small follow-up steps.
