# INVESTIGATION 006 - DHW Final Energy Chain Map

## Status

- Investigation id: `INVESTIGATION_006_DHW_FINAL_ENERGY_CHAIN_MAP`
- Scope: remaining Anexa B DHW / ACS chain after `FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION`.
- Result: no full DHW final-energy implementation is justified.
- Recommended Fixture 011 target: displayed Anexa B page 525 DHW final-energy subtotal reconciliation only.
- Code change justified: no.
- New helper justified: no.

## Source Pages Inspected

| Source | Evidence inspected |
| --- | --- |
| MC001-2022 page 250 | DHW subsystem definitions and general subsystem balance. |
| MC001-2022 page 251 | recovered heat and auxiliary-energy context. |
| MC001-2022 pages 252-253 | useful DHW demand `QW,nd`, already validated by Fixture 010. |
| MC001-2022 page 257 | loss/waste volume relation (3.197), already validated by Fixture 010. |
| MC001-2022 pages 259-264 | distribution loss, recoverable distribution loss, and distribution auxiliary formulas. |
| MC001-2022 pages 265-266 | auxiliary recovery and storage-loss relation (3.228). |
| MC001-2022 page 267 | DHW generation section 3.3.9, delegated to section 3.1.5 / SR EN 15316-4-1. |
| MC001-2022 Anexa B page 524 | school DHW calculation setup, service-unit basis, temperatures, and monthly day counts. |
| MC001-2022 Anexa B page 525 | DHW useful demand, distribution subtotal, storage/generation/auxiliary zero rows, final-energy row, and primary-energy row. |
| MC001-2022 Anexa B pages 526-527 | adjacent lighting boundary and final primary/CO2 summary context. |
| MC001-2022 Anexa B page 533 | service specific final/primary indicators, used by prior Fixture 008. |
| `MC001_DHW_SYSTEM_LOSSES_AND_FINAL_ENERGY_EXTRACTION.md` | prior DHW system-loss extraction and final-energy blocker policy. |
| `INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS.md` | annual distribution-loss energy blocker analysis. |
| `FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION.md` | validated useful-demand input chain. |

PDF text was checked directly from `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`.

## Normative Chain Map

MC001 page 250 defines the subsystem balance:

```text
QW,Y,in = QW,Y,out + QW,Y,ls - QW,Y,ls,rvd
```

where `Y` is the DHW subsystem. MC001 page 250 identifies the DHW system as four subsystems:

- points of use / useful delivery,
- distribution, including recirculation,
- preparation/storage,
- generation of heat for DHW.

The source chain for this validation pass is therefore:

```text
QW,nd
  -> distribution losses and recovered distribution losses
  -> storage losses
  -> generation losses
  -> recovered losses
  -> auxiliary energy
  -> QW,total final energy
```

The Anexa B page 525 worked example does not expose all physical inputs for that full chain. It exposes useful demand and final displayed subtotals.

## Anexa B Page 525 Displayed Chain

| Displayed row | Value | Source handling |
| --- | ---: | --- |
| `Qw,nd,annual, ZT1` | `18519.13 kWh/an` | validated by Fixture 010. |
| `Qw,dis,tot` | `19599.3 kWh`, final row rounded as `19599 kWh` | displayed subtotal is usable for arithmetic reconciliation only. |
| `Qw,sto` | `0 kWh` | displayed zero row; storage formula is not independently validated. |
| `Qw,g` | `0 kWh` | displayed zero row; generator formula is not independently validated. |
| `Ww` | `0 kWh` | displayed zero row; nonzero auxiliary path is not validated. |
| `Qw,total` final energy | `38118 kWh` | reconciles from displayed rows within rounding. |
| `Qw,total` primary energy | `35069 kWhep` | already covered by Fixture 008 through Tabel 5.17 district-heating factor. |

Displayed final-energy reconciliation:

```text
Qw,total = Qw,nd + Qw,dis,tot + Qw,sto + Qw,g + Ww
          = 18519.13 + 19599.3 + 0 + 0 + 0
          = 38118.43 kWh
```

Using the rounded final-row distribution input:

```text
18519.1 + 19599 + 0 + 0 + 0 = 38118.1 kWh
```

Both paths explain the displayed `38118 kWh` within display rounding. This validates only the page 525 displayed subtotal arithmetic, not the underlying distribution/storage/generation formulas.

## Row-By-Row Classification

| Row/component | Source value or relation | Classification | Reason |
| --- | --- | --- | --- |
| Useful demand `QW,nd` | page 525 `18519.13 kWh/an` | `traceable_ready_for_fixture_011` | Already validated by Fixture 010; can be reused as a source input for a displayed subtotal fixture, but should not be re-fit with the implied water constant. |
| Loss/waste volume relation (3.197) | page 524-525 `VW,ls,day = 645 l/day` | `traceable_ready_for_fixture_011` | Already validated by Fixture 010; not part of remaining final-energy system-loss validation. |
| Distribution total as displayed input | page 525 `Qw,dis,tot = 19599.3 kWh` / final row `19599 kWh` | `traceable_ready_for_fixture_011` | Traceable as a displayed subtotal for arithmetic reconciliation only. It is not an independent validation of relations (3.205)-(3.216). |
| Distribution loss during supply | page 525 appears to include `QW,dis,ls` rows; Anexa 3.3.B has related component rows | `blocked_missing_input` | Page 525 does not provide pipe transmittance, lengths/equivalent lengths, ambient zones, operation-time summation, or profile inputs needed to calculate the displayed annual subtotal. Investigation 004 keeps Anexa 3.3.B annual rows blocked. |
| Stub distribution loss | relations (3.206), Anexa 3.3.B `QW,dis,stub` precedent | `blocked_unit_inconsistency` | Investigation 004 found Wh-scale arithmetic displayed as kWh in the Anexa 3.3.B annual/stub row; page 525 does not cleanly expose the missing annualization basis. |
| Recirculation/no-draw distribution loss | relation (3.207), page 525 distribution table | `blocked_visual_formula_review_needed` | Relation (3.207) and the worked Anexa 3.3.B row still need visual review; page 525 does not expose enough formula inputs to resolve it. |
| Recoverable distribution losses | relations (3.214)-(3.216), page 525 distribution area visually ambiguous | `blocked_visual_formula_review_needed` | Source text extraction around `Qw,dis,rbl` is not clean enough, and conditioned-space lengths / recovery treatment are not traceable for page 525. |
| Storage displayed row | page 525 `Qw,sto = 0 kWh` | `traceable_ready_for_fixture_011` | The zero row can be asserted in a displayed subtotal fixture only. Storage-loss relation (3.228) is not validated because storage correction factors, `Hsto,ls`, setpoint, ambient temperature, and hours are absent. |
| Storage formula | relation (3.228) | `blocked_missing_input` | Required storage product/system inputs are not shown in Anexa B page 525. |
| Generation displayed row | page 525 `Qw,g = 0 kWh` | `traceable_ready_for_fixture_011` | The zero row can be asserted in a displayed subtotal fixture only. It does not validate generator losses or efficiency. |
| Generation formula/path | page 267 section 3.3.9 delegates to section 3.1.5 / SR EN 15316-4-1 | `blocked_missing_formula` | No isolated DHW generator formula is present in the inspected DHW section; generator type, allocation, losses, and auxiliary terms are not cleaned into a fixture. |
| Auxiliary displayed row | page 525 `Ww = 0 kWh` | `traceable_ready_for_fixture_011` | The zero row can be asserted in a displayed subtotal fixture only. |
| Auxiliary nonzero path | relations (3.217)-(3.227) | `blocked_missing_input` | Pump design data, pressure drops, flow, load factor, control constants, EEI, operating time, and recovery factor are not traceable for page 525. |
| Recovered losses in final-energy balance | page 250 balance term `QW,Y,ls,rvd`; distribution recovery relations (3.214)-(3.216), auxiliary recovery relations (3.226)-(3.227) | `blocked_visual_formula_review_needed` | The inspected Anexa B page 525 rows do not expose a clear recovered-loss chain into `Qw,total`; do not infer subtraction or heat-credit treatment. |
| Final DHW energy displayed subtotal | page 525 `Qw,total = 38118 kWh` | `traceable_ready_for_fixture_011` | Can be validated as displayed arithmetic from `Qw,nd`, displayed `Qw,dis,tot`, zero `Qw,sto`, zero `Qw,g`, and zero `Ww`. |
| DHW primary energy from final row | page 525 `35069 kWhep`; Tabel 5.17 factor `0.92` | `traceable_ready_for_fixture_011` | Already validated by Fixture 008/Fixture 007 factor path; not necessary as the main Fixture 011 target unless included as a cross-check. |

## Recommended Fixture 011 Target

Recommended next fixture:

```text
FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL
```

Recommended scope:

- validate only the displayed Anexa B page 525 arithmetic:

```text
Qw,total = Qw,nd + Qw,dis,tot + Qw,sto + Qw,g + Ww
```

- use Fixture 010 `Qw,nd = 18519.13 kWh/an` as a source-traced input;
- use displayed `Qw,dis,tot = 19599.3 kWh` or rounded final-row `19599 kWh` with documented rounding policy;
- assert displayed zero rows `Qw,sto = 0`, `Qw,g = 0`, `Ww = 0`;
- assert displayed `Qw,total = 38118 kWh` with rounding tolerance;
- optionally cross-check `38118 * 0.92 = 35068.56 kWhep` against the displayed `35069 kWhep`, but note this primary path is already covered by Fixture 008.

This fixture must be labelled as displayed subtotal reconciliation, not as independent validation of annual distribution losses, storage losses, generation losses, recovered losses, auxiliary energy, or a full DHW final-energy helper.

## Components Not Ready For Fixture 011

| Component | Blocker |
| --- | --- |
| Annual distribution-loss formulas | missing page 525 pipe/system inputs and unresolved Investigation 004 length/unit/formula issues. |
| Storage-loss formula (3.228) | missing storage correction factors, storage wall transmittance, storage setpoint, ambient temperature, and annual hours. |
| Generation losses / efficiency | DHW section delegates to section 3.1.5 and SR EN 15316-4-1; no isolated generator fixture inputs are cleaned. |
| Recovered losses | page 525 recovery rows are visually ambiguous and do not trace into final-energy treatment. |
| Nonzero auxiliary energy | pump and control inputs are absent; page 525 only displays zero. |

## Code Impact

No code change is justified.

Do not create:

- a full DHW final-energy helper,
- a distribution-loss annual helper,
- a storage-loss helper,
- a generator-loss helper,
- an auxiliary-energy helper,
- an orchestrator or production integration.

## Remaining Blockers

- Clean physical-input trace for `Qw,dis,tot = 19599.3 kWh`.
- Resolution of Investigation 004 annual distribution-loss blockers.
- Storage product/system inputs for relation (3.228).
- Generator method extraction from section 3.1.5 / SR EN 15316-4-1, if a future isolated generator task is approved.
- Clear recovered-loss treatment in Anexa B page 525.
- Nonzero auxiliary-energy fixture inputs.

## Tests

No tests were required for this investigation. It is documentation and validation-planning only.

## Boundary Confirmation

- No Physics Engine formula changes.
- No full DHW final-energy implementation.
- No UI, Worker, DB/schema, API, orchestrator, production integration, deploy, or push changes.
