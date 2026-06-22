# INVESTIGATION 015 - Normative Coverage Inventory

## Status

- Investigation id: `INVESTIGATION_015_NORMATIVE_COVERAGE_INVENTORY`
- Milestone: `PHASE_B_NORMATIVE_KB_HARDENING`
- Scope: normative coverage inventory only.
- Target user: energy auditor, through the future full MC001 Auditor Engine.
- Code changes justified: no.
- Dataset migration justified: no.
- Formula implementation justified: no.
- Runtime registry implementation justified: no.

This investigation inventories the current MC001 normative coverage across extraction docs, validation docs, fixtures, datasets, and helper modules. It does not change formulas, add helpers, move datasets, implement a registry, or connect to UI, Workers, API, DB/schema, migrations, deploy, report generation, certificate/CPE workflow, or product integration.

## Purpose

Phase A defined the target auditor input contract, normative knowledge-base schema, and provenance/status model. Phase B starts by asking which normative facts are already covered well enough to become reviewed registry entries, which facts are only partially covered by narrow fixtures, and which domains remain blocked.

The inventory is intentionally conservative. A helper that works with explicit inputs is not treated as full MC001 domain coverage unless the required source tables, applicability rules, units, source references, and validation fixtures are all present.

## Files Inspected

| File or group | Reason inspected |
| --- | --- |
| `docs/mc001-validation/INVESTIGATION_011_FULL_MC001_AUDITOR_ENGINE_ARCHITECTURE.md` | Parent full-auditor architecture and domain list. |
| `docs/mc001-validation/INVESTIGATION_012_AUDITOR_INPUT_CONTRACT.md` | Auditor input sections and derived-value policy. |
| `docs/mc001-validation/INVESTIGATION_013_NORMATIVE_KNOWLEDGE_BASE_SCHEMA.md` | Target normative registry shape. |
| `docs/mc001-validation/INVESTIGATION_014_PROVENANCE_DIAGNOSTICS_STATUS_MODEL.md` | Status, provenance, and blocker vocabulary. |
| `docs/mc001-validation/GAP_ANALYSIS.md` | Current validated helpers and unresolved methodology gaps. |
| `docs/mc001-validation/VALIDATION_MATRIX.md` | Fixture coverage and blocked example statuses. |
| `docs/mc001-validation/CANDIDATE_INVENTORY.md` | Current fixture candidate list and non-executable examples. |
| `docs/mc001-extraction/19_extraction_registry.md` | Current extraction registry, formula ids, table notes, and missing-input vocabulary. |
| `src/physics-engine/*.mjs` | Existing helper families and composition boundaries. |
| `src/physics-engine/datasets/*.mjs` | Existing reviewed dataset modules. |
| `src/physics-engine/tests/**/*.test.mjs` | Unit and validation fixture coverage. |

## Inventory Status Vocabulary

| Status | Meaning |
| --- | --- |
| `validated` | A formula/table/helper path has reviewed source trace and executable fixture or unit-test coverage for the stated narrow scope. |
| `partial` | Some extraction or helper coverage exists, but source rows, applicability, datasets, or fixtures are incomplete. |
| `display_only` | A displayed MC001/example value is reconciled, but the general methodology is not validated. |
| `ambiguous` | The source example or surrounding methodology has unresolved conflicts. |
| `blocked_missing_normative_data` | Required MC001 table, climate/solar source, reference data, or applicability rule is missing. |
| `blocked_missing_input` | Required auditor/system input is not defined well enough to calculate. |
| `blocked_external_standard` | A required method or data source lives in an external standard not locally extracted and reviewed. |
| `out_of_scope` | The domain is intentionally excluded from current Physics Engine validation work. |

Mapping note: detailed machine-style statuses are intentionally conservative substatuses of the review vocabulary. `blocked_missing_input` and `blocked_missing_normative_data` are subtypes of `blocked`, `blocked_external_standard` maps to `external_standard`, and `display_only` maps to `display-only`.

## Coverage Inventory

| Domain | Current status | Source refs and ids currently visible | Helper/dataset/fixture coverage | Blocking gaps | Registry hardening action |
| --- | --- | --- | --- | --- | --- |
| Material correction coefficients | `validated` for existing rows | Tabel 2.2; `MC001_TABEL_2_2_MATERIAL_CORRECTION_COEFFICIENTS`; formula `MC001_2_3_LAMBDA_CORRECTED` | `datasets/mc001Table2_2MaterialCorrectionCoefficients.mjs`; `materialsUValues.mjs`; Fixture 001/003 style tests | Full source page metadata and row-level lifecycle fields are not normalized into a registry. | Promote rows into table-row registry with row keys, unitless coefficient cells, source refs, status, confidence, and version. |
| Material lambda/catalog assumptions | `partial` | Extraction module 02; material lambda values can be auditor-sourced or normative-sourced | `materialsUValues.mjs` accepts explicit lambda values | No complete MC001 material catalog registry, material aliases, density/class context, or fallback policy. | Add material property records only from reviewed MC001 or external source rows; require explicit source for measured/manufacturer overrides. |
| Layer resistance formulas | `validated` for explicit layer stacks | `PHYSICS_LAYER_R`; `MC001_2_6_R_TOTAL` | `materialsUValues.mjs`; Fixture 001/003 unit paths | Surface resistance context and special layer applicability are not fully registry-backed. | Register formulas, symbols, units, required inputs, and applicability for layer stacks and total resistance. |
| R/U/U prime formulas | `validated` for explicit subsets | `MC001_2_7_U_VALUE`; corrected-U path noted in extraction registry | `materialsUValues.mjs`; `transmissionCoefficients.mjs`; Fixture 001/003 | Complete applicability between plain U, corrected U prime, and explicit bridge paths needs machine-readable rules. | Register formula variants and a fail-closed rule preventing silent mixing of corrected-U and explicit bridge methods. |
| Opaque-envelope element areas | `partial` | `MC001_2_1_ENVELOPE_AREA`; geometry extraction docs | Existing helpers consume explicit areas | Raw geometry normalization, element contact type rules, and zone boundary ownership are not executable. | Registry should define symbols/units; future input builder must own raw-to-area validation. |
| Windows, doors, and glazing | `partial` | Extraction docs include opening concepts; no complete row registry | Some envelope/transmission helpers can consume explicit U/area values | Uw/g-value/frame/shading/orientation/source rows and solar gain method are incomplete. | Add opening parameter registry only after source rows and solar applicability are reviewed. |
| Linear thermal bridges | `validated` for explicit formulas, `partial` for catalog coverage | `MC001_2_13_PSI_LINEAR_BRIDGE`; bridge ids in extraction docs | `transmissionCoefficients.mjs`; Fixture 002/003 | Complete psi catalog, L2D-derived path, length ownership, and bridge grouping are incomplete. | Register formula path, row-level psi sources, and applicability; block unknown bridge keys. |
| Point thermal bridges | `partial` | Point bridge concept present through transmission formulas and helper paths | Helper support exists for explicit chi-style contribution where supplied | No comprehensive examples, point-bridge catalog, or applicability fixtures. | Add blocked or partial registry records until reviewed point bridge rows/examples exist. |
| Direct transmission Hd | `validated` for explicit examples, `partial` generally | `MC001_2_11_HD_WITH_BRIDGES`; `MC001_2_12_HD_CORRECTED_U`; `MC001_2_14_TRANSMISSION_HEAT_FLOW` | Fixtures 001-004; `transmissionCoefficients.mjs` | Full raw envelope-to-Hd derivation from all elements and contacts is not implemented. | Register formulas and method exclusivity; future envelope graph must provide all element dependencies. |
| Ground-contact transmission Hg | `partial` / `blocked_missing_normative_data` | `MC001_2_15_HTR_TOTAL` consumes Hg; ground/contact docs partially extracted | Fixture 004 validates a displayed total path from explicit values | General ground-contact method, subsoil parameters, basement/contact applicability, and climate intermediates are incomplete. | Create blocked formula/applicability records for general Hg until source method and input pack are reviewed. |
| Unconditioned-space transmission Hu | `partial` / `blocked_missing_normative_data` | `MC001_2_15_HTR_TOTAL` consumes Hu; unconditioned b-style concepts in extraction docs | Explicit totals can be consumed by Htr helper | General unconditioned-space coefficient derivation and bztu/bve applicability are incomplete. | Register formulas as blocked or explicit-only; require sourced unconditioned-zone data before calculation. |
| Adjacent-space transmission Ha | `partial` / `blocked_missing_normative_data` | `MC001_2_15_HTR_TOTAL` consumes Ha | Explicit values can be summed | Adjacent building/space derivation and applicability are not covered by fixtures. | Add registry records with missing-input blockers and no default-zero behavior. |
| Total transmission Htr | `validated` for explicit component composition | `MC001_2_15_HTR_TOTAL`; component ids Hd/Hg/Hu/Ha | `transmissionCoefficients.mjs`; Fixture 004; Fixture 016 core orchestrator | Upstream component derivation from raw auditor data remains incomplete. | Register Htr formula as explicit-component ready; require provenance for all component inputs. |
| Envelope requirement thresholds | `partial` | Tabel 2.4 and Tabel 2.7 in dataset/helper coverage | `envelopeRequirementChecks.mjs`; dataset tests | Broader source page/row metadata and worked-example coverage limited. | Promote threshold tables to row-level registry after full source trace review. |
| Ventilation coefficients | `validated` for explicit Hve/Qve subset, `partial` generally | `MC001_2_29_Q_VENTILATION_MONTHLY`; `MC001_2_30_HVE`; `MC001_2_31_BVE`; `MC001_2_32_BVE_UNCONDITIONED`; `PHYSICS_AIRFLOW_FROM_ACH` | `ventilationCoefficients.mjs`; Fixture 005; Fixture 016 | Complete raw airflow source, independent air constants, mechanical/fan/AHU boundaries, and unconditioned bve path are incomplete. | Register ACH, airflow, bve, Hve, and Qve formulas with explicit source requirements and blocked fan/AHU records. |
| Airflow, ACH, bve, Hve inputs | `partial` | Ventilation extraction module 06 | Helper accepts explicit volume/ACH/airflow/bve | ACH source, measured airflow source, schedule, operating mode, and bve applicability are not fully specified. | Require auditor input fields or reviewed table rows; fail closed on missing volume, airflow, bve, rhoA, ca, or source. |
| Monthly transmission transfer | `partial` / `blocked_missing_normative_data` | `MC001_2_FIG_2_11_MONTHLY_TRANSMISSION_TRANSFER` | `monthlyTransmissionTransfer.mjs` helper exists | Complete climate dataset, annual exterior temperature, ground terms, and source examples are incomplete. | Keep formula explicit-input only until climate/ground registries are reviewed. |
| Monthly ventilation transfer | `validated` for narrow explicit rows | `MC001_2_29_Q_VENTILATION_MONTHLY`; `MC001_2_30_HVE` | Fixture 005 validates Qve/Hve displayed paths | General monthly climate/setpoint schedule and mechanical ventilation contexts incomplete. | Register monthly formula and input symbols; block official-like mode without climate registry. |
| Internal gains | `partial` / `blocked_missing_normative_data` | `MC001_INTERNAL_GAINS_MONTHLY` in extraction registry | `monthlyBalance.mjs` can consume explicit gains | Default gains, schedules, occupancy factors, and source tables are not fully reviewed. | Register as blocked for default mode; allow explicit traced override/import values only. |
| Solar gains | `blocked_missing_normative_data` | `MC001_SOLAR_GAINS_MONTHLY`; `MC001_SOLAR_GAINS_TRANSPARENT`; `MC001_SOLAR_GAINS_OPAQUE` | Monthly balance can consume explicit Qsol | Solar irradiation, orientation/tilt, shading, glazing g-values, opaque solar absorption, and sky/longwave data are incomplete. | Create solar formula/table records as blocked until climate/solar registry is reviewed. |
| Monthly heating balance | `partial` / `ambiguous` | `MC001_MONTHLY_TOTAL_HEAT_TRANSFER`; `MC001_MONTHLY_TOTAL_GAINS`; `MC001_MONTHLY_HEATING_NEED`; `MC001_ANNUAL_HEATING_NEED_SUM` | `monthlyBalance.mjs`; Fixture 006; Fixture 017 | April/September boundary heating-period method and October worked-example ambiguity remain unresolved. | Register validated months and blocked/ambiguous months separately; do not promote annual full methodology. |
| Monthly cooling balance | `partial` / `blocked_missing_input` | `MC001_MONTHLY_COOLING_NEED`; `MC001_ANNUAL_COOLING_NEED_SUM` | `monthlyBalance.mjs` has calculation branches | No reviewed cooling fixture, cooling setpoints/schedules, and system chain incomplete. | Mark cooling demand as extracted explicit-only until source rows and fixtures exist. |
| DHW useful demand | `validated` for Tabel 3.3.1 path and explicit chain | Formulas `MC001_3_188` through `MC001_3_197`; Tabel 3.3.1 dataset | `dhwUsefulDemand.mjs`; `datasets/mc001DhwDemandTable3_3_1.mjs`; Fixture 010 | Broader service categories and source page metadata need normalized table rows. | Promote useful-demand formulas and Tabel 3.3.1 rows with source refs, units, category applicability, and fixture links. |
| DHW distribution losses | `partial` with component validation | Formulas `MC001_3_200` through `MC001_3_204` and related extraction ids | `dhwDistributionLosses.mjs`; Fixture 009 | Annual distribution-loss basis and scaling remain blocked by Investigation 004. | Register component formulas as explicit-only; annual aggregation must remain blocked. |
| DHW storage paths | `blocked_missing_input` | DHW extraction module 09 includes storage/generation concepts | No complete validated final-energy storage path | Storage formulas, loss factors, source rows, and applicability not validated. | Create blocked formula records with required missing inputs and source requirements. |
| DHW generation paths | `blocked_missing_input` | DHW final-energy chain map and extraction module 09 | No complete validated generation path | Generator efficiency, recovered losses, auxiliary, service boundary, and annual integration missing. | Keep final DHW energy blocked until all source formulas and fixtures exist. |
| DHW recovered losses | `blocked_missing_input` | Investigation 006 chain map | No validated recovered-loss path | Recovery method, sign convention, applicability, and annual basis missing. | Represent as blocked dependency, not as zero. |
| DHW auxiliary paths | `blocked_missing_input` | Investigation 006 chain map | No validated auxiliary path | Pump/control auxiliary inputs and factors not normalized. | Register as blocked until source formulas and system input fields are reviewed. |
| Heating systems final energy | `blocked_missing_input` | Architecture docs and extraction registry identify service-system layer | No heating system final-energy helper validated | Efficiencies, distribution/storage/generation losses, controls, carriers, and auxiliary paths incomplete. | Add gap records and future system formula registry; do not map useful demand directly to final energy. |
| Cooling systems | `blocked_missing_input` | Extraction module 11 partial; cooling demand formulas partial | No validated cooling system final-energy helper | Useful cooling demand, EER/SEER/COP, distribution, fan/AHU, and schedule inputs incomplete. | Keep blocked until source formulas and validation fixture are reviewed. |
| Lighting | `blocked_external_standard` | Extraction module 10; external SR EN 15193-1 dependency | No lighting helper validated | Required external-standard inputs and local extraction are missing. | Represent as external-standard blocker with missing fields and resolution criteria. |
| Renewables | `partial` / `blocked_missing_normative_data` | Extraction module 12; RER display investigation | Fixture 012 reconciles displayed RER only | General production, self-use/export, perimeter, solar/climate data, and primary accounting are unresolved. | Separate production registries from RER methodology; block general RER until perimeter/export rules are reviewed. |
| Final energy rows | `validated` for explicit input rows, `partial` generally | Final energy helper formulas and Fixture 007/008/016 paths | `finalPrimaryCo2Indicators.mjs`; Fixtures 007, 008, 016 | Service-system upstream rows are incomplete for heating/DHW/cooling/lighting. | Register explicit final row schema and require service provenance or measured-comparison status. |
| Primary energy factors | `validated` for reviewed factor rows, `partial` as registry | Tabel 5.17; `datasets/mc001PrimaryEnergyAndCO2Factors.mjs` | `finalPrimaryCo2Indicators.mjs`; Fixtures 007/008/016 | Row-level lifecycle/version/source metadata not normalized. | Promote factor rows into versioned table-row registry with carrier keys and units. |
| CO2 factors | `validated` for explicit factor use, `ambiguous` for Anexa B display | Tabel 5.18; relation 5.4b; Anexa B conflict noted | `finalPrimaryCo2Indicators.mjs`; Fixture 007 | Displayed CO2 inconsistencies and certificate-output context unresolved. | Register factor rows as validated; register Anexa B display conflict as ambiguous example-output record. |
| RER | `display_only` / `blocked_missing_normative_data` | Investigation 007; Fixture 012 | Displayed RER reconciliation fixture only | General RER methodology, perimeter/export treatment, renewable production inputs, and denominator basis unresolved. | Mark displayed reconciliation as non-general; create blocked general RER records. |
| Energy class thresholds Tabel 5.7-5.14 | `validated` for explicit interval lookup | Tabel 5.7-5.14; `datasets/mc001EnergyClassThresholds.mjs` | `energyClassAssignment.mjs`; Fixture 013 | Certificate class labels, mixed-use weighted thresholds, and Anexa B display labels unresolved. | Promote threshold rows to registry with category, indicator, interval semantics, and applicability rules. |
| Utility inclusion Tabel 5.6 | `validated` | Tabel 5.6; extraction module 15 | `utilityInclusionThresholds.mjs`; Fixture 014 | Mixed-use utility weighting and virtual ventilation/cooling contexts not resolved. | Register utility flags by building category/service and keep mixed-use as blocked applicability. |
| Optional-utility threshold recalculation | `validated` for explicit Nota 4 case | Tabel 5.6 / Nota 4; Fixture 014 | `utilityInclusionThresholds.mjs`; school-without-cooling example | General optional utility combinations need explicit inputs and unit/factor trace. | Register recalculation formula with required optional utility rows and CO2 factor source ids. |
| Reference building | `blocked_missing_normative_data` | Extraction module 14 partial | No reference-building helper validated | Reference parameters, applicability, source tables, and comparison graph incomplete. | Represent as blocked table/formula group; no reference readiness claims. |
| Certificate/CPE/report outputs | `out_of_scope` / `blocked_missing_input` | Architecture docs; Investigation 007 notes | No certificate/CPE/report adapter in validation scope | Full auditor graph, reference building, class labels, CPE workflow, and output rules incomplete. | Keep future adapter records separate from calculation registries; no Phase B implementation. |
| Mixed-use weighted thresholds | `blocked_missing_normative_data` | Phase A blocker list; class/utility docs | No helper validated | Weighted threshold method and zone/category basis unresolved. | Add explicit blocked applicability records. |
| Overheating/discomfort hours above 26 degC | `blocked_missing_input` | Phase A blocker list | No helper validated | Hourly/period data, comfort method, and source requirements absent. | Register as blocked domain dependency. |
| Virtual ventilation | `blocked_missing_input` | Phase A blocker list | No helper validated | Full calculation method and input sources absent. | Register as blocked ventilation/classification dependency. |
| Climate annex and solar datasets | `blocked_missing_normative_data` | Module 17; extraction registry | No complete official climate/solar dataset module | Monthly exterior temperature, annual temperature, irradiation by orientation/tilt, sky/longwave, location keys missing. | Phase B should create gap records and registry shape, not invent values. |
| Economic audit formulas | `blocked_missing_normative_data` / `ambiguous` | Module 16; formulas 6.1/6.3/6.4 visually blocked | No helper validated | Source visual verification and formula extraction incomplete. | Keep outside calculation readiness until source formulas are reviewed. |

## Fixture Coverage Summary

| Fixture range | Coverage type | Registry implication |
| --- | --- | --- |
| Fixtures 001-004 | Envelope materials, bridges, and explicit transmission totals. | Strong candidates for formula/table/symbol/unit registry seeds, but upstream raw-data completeness remains partial. |
| Fixture 005 | Explicit ventilation Hve/Qve summary. | Candidate for ventilation formula records with explicit source requirements and blocked raw airflow defaults. |
| Fixtures 006 and 017 | Monthly heating summary with blocked April/September and ambiguous October preserved. | Candidate for month-level status records; not full annual heating methodology. |
| Fixtures 007, 008, and 016 | Explicit final/primary/CO2 indicators. | Candidate for factor table rows and explicit final-energy row schema. |
| Fixtures 009-011 | DHW useful/display/component pieces. | Candidate for useful-demand and component registries; full final-energy chain remains blocked. |
| Fixture 012 | Displayed RER reconciliation. | Registry must label this display-only and prevent use as general RER methodology. |
| Fixtures 013-014 | Class thresholds, utility inclusion, optional-utility recalculation. | Candidate for Tabel 5.6 and Tabel 5.7-5.14 registries with applicability blockers. |
| Fixtures 015-018 | Level 0/Level 1 summaries, core composition, monthly heating composition, fail-closed hardening. | Confirm current composition boundary; do not imply Level 2 full auditor readiness. |

## Domains Ready For Registry Seeding

These areas can become early registry records after row-level source refs, units, and lifecycle fields are added:

- Tabel 2.2 material correction coefficients.
- Layer resistance, total resistance, and U-value formulas for explicit layer stacks.
- Explicit direct transmission formulas and Htr component-sum formula.
- Explicit ventilation ACH/airflow/bve/Hve/Qve formulas.
- Tabel 3.3.1 DHW useful-demand rows and formulas 3.188-3.197.
- Explicit DHW distribution component formulas, with annual paths blocked.
- Tabel 5.17 primary energy factors.
- Tabel 5.18 CO2 factors.
- Tabel 5.6 utility inclusion flags.
- Tabel 5.7-5.14 energy class threshold rows.
- Optional-utility threshold recalculation formula for explicit optional utility rows.

## Domains That Must Remain Blocked

These areas must not be promoted to production calculation or Level 2 orchestration by Phase B:

- Complete climate/solar official dataset.
- Solar gains from raw geometry/openings.
- Internal gains defaults and schedules.
- General ground-contact transmission.
- General unconditioned/adjacent space transmission.
- Raw ventilation/infiltration from incomplete auditor data.
- April/September heating-period boundary method.
- October MC001 worked-example ambiguity.
- Full DHW final-energy chain.
- Annual DHW distribution-loss basis.
- DHW storage/generation/recovered/auxiliary paths.
- Heating system final-energy chain.
- Cooling systems.
- Lighting under SR EN 15193-1.
- General renewables and RER methodology.
- Reference building.
- Mixed-use weighted thresholds.
- Overheating/discomfort.
- Virtual ventilation full calculation.
- Certificate/CPE/report generation.

## Fail-Closed Implications

The future normative KB must reject or block:

- formula ids that lack source refs, units, symbols, status, and confidence;
- table rows that lack row keys, source refs, units, and lifecycle status;
- table defaults that are not reviewed normative rows;
- explicit helper inputs that lack auditor or source trace;
- display-only reconciliations requested as general methodology;
- ambiguous example values requested as validated formulas;
- calculated coefficients submitted as normal auditor inputs;
- certificate or CPE readiness claims while any required domain is blocked.

## Downstream Engine Usage

The inventory gives downstream milestones a reviewed map:

- Phase B can harden registry contracts without implementing runtime registries.
- Phase C can define schema fixtures for auditor input and registry lookup behavior.
- Future domain phases can pick a single ready registry slice and add executable tests.
- Level 2 full MC001 auditor implementation remains blocked until every required domain is either calculated, not applicable with source, or explicitly blocked with a readiness impact.

## Out-Of-Scope Boundaries

This investigation does not:

- implement a registry;
- migrate existing datasets;
- add formulas or helpers;
- resolve blocked source gaps;
- introduce UI, API, Worker, DB/schema, migration, deploy, report, certificate/CPE, or product integration work;
- authorize Level 2 full auditor orchestration.
