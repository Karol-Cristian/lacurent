# MC001 Implementation Map

Data: 2026-06-05

Scope: mapare MC001-like pentru motorul fizic LaCurent. Nu reprezinta certificare oficiala.

Status values:

- `implemented`
- `partially_implemented`
- `missing`
- `needs_registry`
- `needs_user_decision`
- `external_normative_reference`

| MC001 area | Topic | Formula / value / rule | Implementation status | Target file | Tests needed | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A. Date generale | Tip cladire | locuinta individuala vs colectiva | partially_implemented | `workers/save-house.js`, `energyClassThresholds.registry.ts` | class type inference tests | Worker infers from strings; needs robust normalized enum. |
| A. Date generale | Localizare / clima | climate zone, HDD, monthly climate | partially_implemented | `climate.registry.ts`, `monthlyClimate.registry.ts`, worker monthly climate | real-climate fallback tests | Current data is internal estimate. |
| A. Date generale | Temperaturi interioare | heating/cooling setpoints | partially_implemented | `buildPhysicalModel.ts`, worker `buildEnergyDemandV03` | setpoint tests | Defaults exist; source metadata weak in worker. |
| A. Date generale | Zone termice | one heated zone | implemented | `Building.ts`, `ThermalZone.ts`, `buildPhysicalModel.ts` | one-zone tests | Multi-zone prepared but not production-complete. |
| A. Date generale | Suprafete / volume | area, footprint, heated volume | partially_implemented | `buildPhysicalModel.ts`, worker | geometry derivation tests | Areas often estimated from square footprint. |
| B. Anvelopa | Materiale | material registry with lambda | implemented | `materials.registry.ts` | registry lookup tests | Need source confidence review. |
| B. Anvelopa | Straturi | material layers with thickness | implemented | `Material.ts`, `EnvelopeElement.ts` | layer tests | User input often lacks layers. |
| B. Anvelopa | Lambda | `lambda` per material | implemented | `materials.registry.ts` | lambda presence tests | Missing lambda can return R=0 in some calculators. |
| B. Anvelopa | R | `R = d / lambda` | implemented | `resistance.ts`, `envelopeV02.ts`, `criticalMc001Chain.mjs` | atomic tests | Trace only in critical chain. |
| B. Anvelopa | U | `U = 1 / R_total` | implemented | `transmittance.ts`, `envelopeV02.ts` | atomic tests | Worker has inline `elementU`. |
| B. Anvelopa | U corrected | `(U x A + H_tb) / A` | partially_implemented | `envelopeV02.ts`, `criticalMc001Chain.mjs` | bridge correction tests | Worker exposes bridges separately. |
| B. Anvelopa | Rezistente superficiale | Rsi/Rse | implemented | `surfaceResistances.registry.ts`, `resistance.ts` | registry tests | Worker inline `elementU` needs audit for same values. |
| B. Anvelopa | Elemente catre exterior | walls/windows/doors/roof | implemented | `buildPhysicalModel.ts`, worker | envelope category tests | Areas are estimated when missing. |
| B. Anvelopa | Elemente catre sol | floor on ground | partially_implemented | `buildPhysicalModel.ts`, `correctedTransmittance.ts`, worker | ground factor tests | Ground model is simplified. |
| B. Anvelopa | Spatii neincalzite | attic/unconditioned | partially_implemented | `envelopeV02.ts`, `ThermalZone.ts` | b_ztu tests | Fallback `0.85` needs decision/registry. |
| B. Anvelopa | Punti termice | `H_tb = sum(psi x L)` | partially_implemented | `thermalBridgeLoss.ts`, `envelopeV02.ts`, worker | psi x L tests | Worker uses perimeter x `0.25`. |
| B. Anvelopa | Factori corectie | tau/boundary correction | needs_registry | `correctedTransmittance.ts` | factor tests | Numeric rules are simplified and not official. |
| C. Pierderi | Htr | sum element H | implemented | `transmissionHeatTransfer.ts`, `envelopeV02.ts`, worker | Htr total tests | Need naming for bridge inclusion. |
| C. Pierderi | Hve | `0.34 x airflow x recovery factor` | implemented | `ventilationV02.ts`, `ventilationHeatTransfer.ts`, worker | Hve tests | ACH fallback needs registry/decision. |
| C. Pierderi | Ventilare naturala | ACH fallback | partially_implemented | worker, `buildPhysicalModel.ts` | ACH fallback tests | Not MC001-validated. |
| C. Pierderi | Ventilare mecanica | recovery factor | partially_implemented | worker, systems models | recovery tests | Reference recovery numeric value missing. |
| C. Pierderi | Infiltratii | ACH proxy | partially_implemented | worker, ventilation models | infiltration tests | No detailed leakage model. |
| D. Cerere utila | Incalzire utila | annual HDD and monthly balance | partially_implemented | `heatingDemandV02.ts`, worker v03 | method parity tests | Production uses monthly gains method. |
| D. Cerere utila | Racire utila | simplified monthly cooling | partially_implemented | worker v03, `coolingDemandMonthly.ts` | cooling tests | Lower confidence. |
| D. Cerere utila | ACM util | occupants or area fallback | partially_implemented | `dhwDemand.ts`, `systemsLayerV04.ts`, worker | DHW tests | Need confirmed MC001 input method. |
| D. Cerere utila | Iluminat util | separate model exists | partially_implemented | `lightingDemand.ts` | lighting tests | Not clearly in production class chain. |
| E. Sisteme | Incalzire | subsystem efficiency product | partially_implemented | `systemsLayerV04.ts`, worker | system efficiency tests | Values are mostly internal estimates. |
| E. Sisteme | Randament generare | generation presets | partially_implemented | generation registries, worker presets | registry parity tests | Reference values missing. |
| E. Sisteme | Distributie | distribution presets | partially_implemented | distribution registries | tests | Need MC001-like values. |
| E. Sisteme | Emisie | emission presets | partially_implemented | emission registries | tests | Need official/reference values. |
| E. Sisteme | Reglaj | control presets | partially_implemented | control registries | tests | Need source review. |
| E. Sisteme | Stocare | storage presets | partially_implemented | storage registries | tests | DHW storage values missing. |
| E. Sisteme | Pompe auxiliare | auxiliary presets | partially_implemented | auxiliary registries, worker | auxiliary tests | Needs reference values. |
| E. Sisteme | ACM | useful to final energy | partially_implemented | `systemsLayerV04.ts`, worker | DHW system tests | System source often missing from DB. |
| E. Sisteme | Racire | demand / SEER | partially_implemented | worker, `coolingSystemConsumption.ts` | SEER tests | Reference SEER not provided. |
| E. Sisteme | Ventilare | heat recovery if mechanical | partially_implemented | ventilation models | mechanical tests | Numeric reference recovery missing. |
| F. Energie finala | By carrier | final by carrier | implemented | `systemsLayerV04.ts`, worker | carrier aggregation tests | Carrier naming mismatch with new MC001 registries. |
| F. Energie finala | By use | heating/cooling/DHW/auxiliary | implemented | `systemsLayerV04.ts`, worker | by-use tests | Trace missing in worker. |
| F. Energie finala | Total | sum by use | implemented | `systemsLayerV04.ts`, worker | total tests | ok. |
| G. Energie primara | Factors | MC001-like user-provided factors | partially_implemented | `primaryEnergyFactors.registry.ts`, worker inline factors | parity tests | Worker not yet aligned. |
| G. Energie primara | Renewable/nonrenewable/total | computed by carrier | implemented | `primaryEnergyAndCo2V05.ts`, worker | primary tests | Factor source mismatch. |
| G. Energie primara | Specific total | kWh/m2.year | implemented | `primaryEnergyAndCo2V05.ts`, worker | specific tests | unit string inconsistent. |
| H. CO2 | Factors | MC001-like user-provided factors | partially_implemented | `co2Factors.registry.ts`, worker inline factors | parity tests | Worker not yet aligned. |
| H. CO2 | kg/year and kg/m2.year | computed | implemented | `primaryEnergyAndCo2V05.ts`, worker | CO2 tests | factor source mismatch. |
| I. Clase | Thresholds | primary energy thresholds | implemented | `energyClassThresholds.registry.ts`, worker inline thresholds | boundary tests | Duplicate source of truth. |
| I. Clase | Indicator | primary kWh/m2.year | implemented | `estimatedEnergyClass.ts`, worker | class tests | Must stay "estimativ". |
| I. Clase | Individual vs collective | threshold sets | implemented | registry + worker | building type tests | Inference can be fragile. |
| J. Cladire referinta | Envelope values | standard and nZEB U/R | implemented registry only | `referenceEnvelopeValues.registry.ts` | reference registry tests | Builder not active. |
| J. Cladire referinta | Values missing | systems, ventilation, DHW | missing | future builder | missing-value tests | Do not invent. |
| J. Cladire referinta | Copy real geometry/climate | rule documented | partially_implemented | docs/registries | builder tests later | Builder not implemented. |
| J. Cladire referinta | Replace real performance | rule documented | partially_implemented | docs/registries | builder tests later | Needs numeric reference registries. |
| J. Cladire referinta | Not implementable yet | reference systems/ventilation/DHW | needs_user_decision | future | blocking tests | Must ask user. |
