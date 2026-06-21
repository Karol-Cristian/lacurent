# INVESTIGATION 016 - Normative Gap Register

## Status

- Investigation id: `INVESTIGATION_016_NORMATIVE_GAP_REGISTER`
- Milestone: `PHASE_B_NORMATIVE_KB_HARDENING`
- Scope: normative gap register only.
- Target user: energy auditor, through the future full MC001 Auditor Engine.
- Code changes justified: no.
- Dataset migration justified: no.
- Formula implementation justified: no.

This investigation converts the Phase B coverage inventory into a gap register. It does not resolve gaps, invent data, change formulas, add helpers, create registries, or modify UI, Workers, API, DB/schema, migrations, deploy, report generation, certificate/CPE workflow, or product integration.

## Purpose

The full MC001 Auditor Engine must fail closed whenever a required formula, table row, source, unit, applicability rule, external standard, or auditor input is missing. A gap register makes those blockers explicit before any runtime normative KB or Level 2 orchestrator is implemented.

Each gap is written so future work can decide whether implementation must wait, what source must be reviewed, and what fixture should validate the resolution.

## Gap Record Fields

| Field | Meaning |
| --- | --- |
| `Gap id` | Stable Phase B blocker id. |
| `Domain` | MC001 domain or future engine layer affected. |
| `Missing data/formula/table` | Exact missing normative or input contract dependency. |
| `Why needed` | Calculation or registry reason this gap matters. |
| `Blocked downstream calculations` | Values or workflows that cannot be claimed complete. |
| `Source needed` | Source document, standard, dataset, expert input, or product decision needed to resolve. |
| `Source type` | `MC001`, `external_standard`, `climate_dataset`, `expert_input`, `product_decision`, or `validation_fixture`. |
| `Risk` | `critical`, `high`, `medium`, or `low`. |
| `Recommended extraction/fixture` | Suggested next validation artifact. |
| `Implementation must wait` | Whether runtime calculation must wait for this gap. |

## Gap Register

| Gap id | Domain | Missing data/formula/table | Why needed | Blocked downstream calculations | Source needed | Source type | Risk | Recommended extraction/fixture | Implementation must wait |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `NB-GAP-001` | Climate and solar | Complete climate dataset: monthly exterior temperature, annual exterior temperature, irradiation by orientation/tilt, sky/longwave where applicable | Official-like monthly transmission, ventilation, solar gains, cooling, renewables, and reference paths need reviewed climate data | Qtr monthly, Qve monthly, Qsol, QH;nd, QC;nd, renewables, RER, reference building | MC001 climate annex and any referenced source datasets | `climate_dataset` | critical | `INVESTIGATION_018_CLIMATE_SOLAR_REGISTRY_SOURCE_REVIEW` | yes for official-like calculations |
| `NB-GAP-002` | Solar gains | Transparent and opaque solar gain tables, orientation/tilt/shading inputs, glazing factors, opaque absorption/emittance basis | Monthly balance cannot derive Qsol from raw envelope/opening data | QH;gn, QC;gn, QH;nd, QC;nd, cooling, renewables, RER | MC001 module 08 and linked climate/solar sources | `MC001` and `climate_dataset` | critical | Solar gains extraction and blocked fixture with explicit Qsol import path | yes |
| `NB-GAP-003` | Internal gains | Default internal gains, schedules, occupancy factors, and applicability by building type | Monthly balance cannot derive Qint from auditor classification alone | QH;gn, QC;gn, QH;nd, QC;nd | MC001 internal gains tables or explicit auditor/measured source policy | `MC001` or `expert_input` | high | Internal gains registry fixture distinguishing normative rows from explicit imports | yes for derived default gains |
| `NB-GAP-004` | Ground-contact transmission | General Hg method, subsoil/contact parameters, basement/contact applicability, ground temperature basis | Htr can only consume explicit Hg; full envelope graph cannot derive it | Hg, Htr, Qtr, monthly heating/cooling | MC001 transmission/ground sections and reviewed examples | `MC001` | critical | Ground-contact formula extraction and explicit blocker fixture | yes |
| `NB-GAP-005` | Unconditioned/adjacent spaces | Hu/Ha and bztu-style derivation, unconditioned-zone parameters, adjacent-space applicability | Htr component graph cannot safely derive non-direct transmission paths | Hu, Ha, Htr, Qtr, monthly heating/cooling | MC001 transmission and ventilation sections | `MC001` | high | Unconditioned and adjacent transmission extraction fixture | yes |
| `NB-GAP-006` | Ventilation raw inputs | Source policy for ACH, measured airflow, design airflow, bve, rhoA, ca, schedules, unconditioned ventilation, fan/AHU boundaries | Hve helper accepts explicit values, but full auditor engine needs raw-data validation | Hve, Qve, fan/AHU service energy, monthly heating/cooling | MC001 module 06, module 11, auditor measurement policy | `MC001` and `expert_input` | high | Ventilation raw-input registry fixture and negative tests for invented ACH | yes for raw-data calculation |
| `NB-GAP-007` | Monthly heating boundary | April and September boundary heating-period method | Existing fixtures keep boundary months blocked; annual QH;nd cannot be official-like | Monthly QH;nd, annual QH;nd, final heating useful demand | MC001 worked example and methodology source review | `MC001` | critical | Boundary heating-period extraction or explicit unresolved-blocker fixture | yes for complete annual heating |
| `NB-GAP-008` | Monthly heating ambiguity | October MC001 worked-example ambiguity | Source example conflicts with validated formula branch or displayed row behavior | October QH;nd, annual QH;nd, worked-example validation | MC001 example review and reviewer decision | `MC001` | high | October ambiguity decision record and fixture | yes for example strict validation |
| `NB-GAP-009` | Monthly cooling | Cooling balance source examples, cooling setpoints, schedule/applicability, and annual aggregation validation | Cooling demand branch is not fixture-validated as a full method | QC;nd, final cooling energy, primary/CO2 for cooling | MC001 monthly cooling sections and examples | `MC001` | high | Cooling monthly demand fixture with explicit inputs | yes |
| `NB-GAP-010` | DHW annual distribution | Annual basis for DHW distribution-loss formulas and scaling from components to annual result | Component formulas exist, but annual distribution loss cannot be claimed validated | QW distribution annual, DHW final energy | MC001 DHW sections and Investigation 004 resolution | `MC001` | critical | Annual DHW distribution-loss basis fixture | yes |
| `NB-GAP-011` | DHW final-energy chain | Storage, generation, recovered losses, auxiliary energy, and annual service integration | Useful demand and components cannot become final energy without these paths | DHW final energy, primary/CO2, RER, certificate readiness | MC001 DHW system formulas and source tables | `MC001` | critical | Full DHW chain map fixture after source extraction | yes |
| `NB-GAP-012` | Heating systems | Heating system efficiencies, distribution/storage/generation losses, carrier assignment, auxiliary energy | Useful heating demand cannot become final energy | Heating final energy, total final energy, primary/CO2, class indicators | MC001 service-system sections and manufacturer/override source policy | `MC001` and `expert_input` | critical | Heating-system final-energy input contract and fixture | yes |
| `NB-GAP-013` | Cooling systems | Cooling system performance, distribution/fan/AHU energy, source tables, and applicability | Cooling demand cannot become final energy | Cooling final energy, primary/CO2, RER, class thresholds with optional cooling | MC001 module 11 and system data policy | `MC001` and `expert_input` | high | Cooling-system extraction and blocked fixture | yes |
| `NB-GAP-014` | Lighting | SR EN 15193-1 dependent inputs, lighting schedules, controls, daylight factors, installed power method | Lighting is required by full non-residential audit paths and cannot be locally derived | Lighting final energy, primary/CO2, RER, certificate readiness | Local reviewed SR EN 15193-1 extraction or explicit auditor import policy | `external_standard` | critical | Lighting external-standard blocker registry fixture | yes |
| `NB-GAP-015` | Renewables | Renewable production methods, self-use/export treatment, system parameters, climate/solar dependencies | General renewable primary contribution and RER cannot be calculated | Renewable final/primary split, RER, indicators, certificate readiness | MC001 renewables sections and climate/solar data | `MC001` and `climate_dataset` | critical | Renewables production/perimeter extraction fixture | yes |
| `NB-GAP-016` | RER methodology | General RER perimeter, denominator, export treatment, carrier interactions, display-vs-method rules | Fixture 012 is display-only and cannot validate general RER | RER, class/certificate indicators, report readiness | MC001 final/primary/RER sections and reviewer decision | `MC001` | critical | RER general methodology fixture with blocked display-only misuse test | yes |
| `NB-GAP-017` | Primary/CO2 factor registry | Row-level lifecycle/version/source metadata for Tabel 5.17 and Tabel 5.18 | Factor values work in helpers but need registry hardening for full audit trace | Primary energy, CO2, specific indicators, class assignment | Existing MC001 table extraction and dataset review | `MC001` | medium | Factor table-row registry fixture | no for explicit fixture use, yes for full auditor registry |
| `NB-GAP-018` | CO2 display conflicts | Anexa B displayed CO2 inconsistency and reconciliation policy | Displayed conflict must not contaminate general factor method | Example validation, report/certificate display readiness | Investigation 003 and reviewer decision | `MC001` | high | Ambiguous example-output registry fixture | yes for Anexa B strict output |
| `NB-GAP-019` | Energy class labels | Displayed class labels in Anexa B and certificate context | Threshold lookup is validated, but displayed labels/certificate classes remain unresolved | Certificate class labels and official-like report output | Investigation 007 and MC001 certificate sections | `MC001` | high | Class-label display conflict fixture | yes for certificate labels |
| `NB-GAP-020` | Mixed-use thresholds | Weighted threshold formula, zone/category basis, utility inclusion across mixed uses | Existing class and utility helpers assume explicit single-table context | Mixed-use classes, thresholds, utility recalculation, certificate readiness | MC001 class/threshold sections | `MC001` | high | Mixed-use threshold registry fixture | yes |
| `NB-GAP-021` | Utility special cases | Virtual ventilation, optional utilities across categories, overheating/discomfort interactions | Tabel 5.6 and Nota 4 work for explicit cases only | Adjusted thresholds, class readiness, discomfort metrics | MC001 module 15 and related methodology sections | `MC001` | medium | Utility applicability blocker fixture | yes for those cases |
| `NB-GAP-022` | Reference building | Complete reference-building parameter datasets, applicability, and comparison formulas | Full audit and certificate/report readiness need reference context | Reference indicators, comparisons, certificate/report outputs | MC001 reference building module | `MC001` | critical | Reference-building registry extraction fixture | yes |
| `NB-GAP-023` | Certificate/CPE workflow | Official output rules, adapter eligibility, CPE workflow, report fields, class display policy | Full auditor result cannot claim official certificate/CPE readiness | Certificate/CPE generation, official report output | Future product/legal workflow decision after engine completeness | `product_decision` and `MC001` | critical | Future certificate adapter readiness investigation | yes |
| `NB-GAP-024` | Material catalog | Complete material lambda catalog, aliases, source rows, override policy | Current helpers require explicit lambda but cannot normalize arbitrary auditor material names | R/U/U prime, envelope graph | MC001 material tables or external/manufacturer source policy | `MC001` and `expert_input` | medium | Material property registry fixture | yes for catalog lookup, no for explicit-source lambda |
| `NB-GAP-025` | Openings and glazing | Complete Uw/g-value/frame/shading/orientation source model | Transmission can consume explicit U/area, but solar and opening-specific methods remain incomplete | Hd, Qsol, monthly balance, cooling, reference building | MC001 opening/glazing/solar sections and manufacturer source policy | `MC001` and `expert_input` | high | Opening/glazing input and registry fixture | yes for opening-derived methods |
| `NB-GAP-026` | Thermal bridge catalog | Full psi/chi/L2D catalog rows, bridge grouping, point bridge examples | Explicit bridges work, but full envelope graph cannot derive bridge coefficients | Hd, Htr, Qtr, envelope compliance | MC001 bridge tables/examples or calculated source policy | `MC001` and `expert_input` | medium | Bridge catalog row registry fixture | yes for catalog lookup, no for explicit-source psi |
| `NB-GAP-027` | Overheating/discomfort | Hours above 26 degC, period basis, input time resolution, applicability | Full auditor/certificate comfort outputs cannot be claimed | Discomfort indicators and certificate/report sections | MC001 methodology and any external referenced data | `MC001` | medium | Overheating/discomfort blocker fixture | yes |
| `NB-GAP-028` | Virtual ventilation | Full calculation method and required inputs | Listed blocker must remain explicit in class/utility/ventilation contexts | Ventilation-related certificate or threshold paths | MC001 methodology source review | `MC001` | medium | Virtual ventilation blocker record | yes |
| `NB-GAP-029` | Economic audit formulas | Formulas 6.1, 6.3, 6.4 and related cost/measure inputs need visual/source verification | Energy measures and audit economics cannot be included in engine readiness | Audit-measure economics, report sections | MC001 audit measures module and reviewer extraction | `MC001` | medium | Economic formulas extraction fixture | yes |
| `NB-GAP-030` | Normative registry record shape | Executable registry fixture for formulas, tables, rows, symbols, units, statuses, source refs, lifecycle | Phase A schema is design-only; no runtime contract proves fail-closed lookup behavior | All future registry-backed calculations | Phase A docs and Phase B hardening plan | `validation_fixture` | high | Registry shape fixture with positive/negative cases | yes before Level 2 |
| `NB-GAP-031` | Auditor input validation | Executable schema for raw auditor input fields and derived-value override/import policy | Input contract is design-only; Level 2 cannot safely consume arbitrary raw input | All domain calculations and provenance | Investigation 012 and future schema fixture | `validation_fixture` | high | Auditor input builder schema fixture | yes before Level 2 |
| `NB-GAP-032` | Provenance value envelopes | Runtime value envelope and helper trace implementation strategy | Phase A status model is design-only; full audit graph needs machine-readable provenance | Diagnostics, readiness, report adapters | Investigation 014 and future wrappers | `validation_fixture` | high | Provenance/status fixture for one domain slice | yes before Level 2 |

## Critical Blocker Set

The following gaps block any Level 2 full MC001 Auditor Engine implementation:

- `NB-GAP-001` complete climate and solar dataset.
- `NB-GAP-004` general ground-contact transmission.
- `NB-GAP-007` April/September boundary heating-period method.
- `NB-GAP-008` October MC001 worked-example ambiguity for strict example validation.
- `NB-GAP-010` annual DHW distribution-loss basis.
- `NB-GAP-011` full DHW final-energy chain.
- `NB-GAP-012` heating systems final-energy chain.
- `NB-GAP-014` lighting external-standard data.
- `NB-GAP-015` renewables production and export treatment.
- `NB-GAP-016` general RER methodology.
- `NB-GAP-022` reference building.
- `NB-GAP-023` certificate/CPE workflow.
- `NB-GAP-030` executable normative registry record shape.
- `NB-GAP-031` executable auditor input validation.
- `NB-GAP-032` provenance value envelopes.

## Gaps That Can Be Hardened Without Formula Implementation

These gaps can be reduced by documentation/schema/fixture work before any formula implementation:

- `NB-GAP-017` primary/CO2 factor registry metadata.
- `NB-GAP-018` CO2 display conflict record.
- `NB-GAP-019` energy class label conflict record.
- `NB-GAP-020` mixed-use threshold blocked applicability record.
- `NB-GAP-021` utility special-case blocked applicability record.
- `NB-GAP-024` material catalog source policy.
- `NB-GAP-026` bridge catalog row structure.
- `NB-GAP-030` normative registry record shape.
- `NB-GAP-031` auditor input schema fixture.
- `NB-GAP-032` provenance/status fixture.

## Fail-Closed Rules From The Gap Register

Future code must fail closed when:

- a requested gap id is still open and required by the calculation mode;
- a registry entry is missing and the engine would otherwise default a value;
- an external-standard blocker is required by a requested output;
- a display-only reconciliation is requested as general methodology;
- a source conflict is not carried as an ambiguous status;
- an auditor provides derived coefficients as normal input instead of validation import or expert override;
- a certificate/CPE/report adapter is requested before all calculation domains are complete.

## Downstream Engine Usage

The gap register should be consumed by future milestones as:

- a blocker backlog for registry records;
- a checklist for fixture proposals;
- a source-review queue for extraction work;
- an implementation gate for Level 2 full auditor orchestration;
- a diagnostics vocabulary seed for future result graphs.

## Out-Of-Scope Boundaries

This investigation does not:

- resolve any gap;
- implement registry lookup;
- add or modify tests;
- add formulas, helpers, orchestrators, schemas, migrations, or adapters;
- introduce UI, API, Worker, DB/schema, deploy, report, certificate/CPE, or product integration work.
