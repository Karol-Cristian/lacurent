# P7E Internal Gains and Adjacent-Zone Contracts

## Scope

Base: `c4a26b05b2e7aead145be2c7174b0916169c7bb3`.

P7E reviewed every Chapter 2 relation that remained `PARTIAL` or
`NOT_IMPLEMENTED` after P7D, then implemented the source-complete internal-gain
and adjacent-zone contracts without changing validated Chapter 2 useful-demand
formulas.

## Before / After Coverage

| Metric | Before P7E | After P7E |
| --- | ---: | ---: |
| Formula slots tracked | 87 | 87 |
| Formula-bearing slots | 85 | 85 |
| COMPLETE | 67 | 73 |
| PARTIAL | 15 | 9 |
| BOUNDED | 0 | 0 |
| NOT_IMPLEMENTED | 3 | 3 |
| Complete coverage | 78.8% | 85.9% |
| Complete or partial coverage | 96.5% | 96.5% |

## Relations Reviewed

| Relation | P7E decision | Reason |
| --- | --- | --- |
| 2.1 | remains PARTIAL | Geometry is represented as explicit Building DNA. A separate measured-geometry workflow is outside this milestone. |
| 2.25 | remains PARTIAL | Ground-contact delegated methods are not fully reproduced by owned MC001 Chapter 2 material; explicit source-backed factors remain the production contract. |
| 2.26 | remains PARTIAL | Adjacent/ground correction paths are represented by explicit source-backed correction factors. |
| 2.34 | promoted to COMPLETE | Adjacent unconditioned-zone internal gains now execute with explicit/source-backed bztu, distribution and gain-reduction inputs, with execution traces and Chapter 2 orchestration coverage. |
| 2.35 | promoted to COMPLETE | Table 2.15 category-area-duration internal gains are implemented for supported building-use categories; explicit monthly Qint remains accepted for expert inputs. |
| 2.36 | remains PARTIAL | Hsol is source-backed, but automatic Qsol still requires Qsky and complete solar element inputs. |
| 2.37 | promoted to COMPLETE | Adjacent unconditioned-zone solar gain distribution/reduction is implemented when direct adjacent Qsol is explicit/source-backed. Direct Qsol generation remains tracked under the solar relations. |
| 2.38 | remains PARTIAL | Direct solar gains still require full transparent/opaque solar element input contracts. |
| 2.39 | remains PARTIAL | Transparent solar gains have Hsol available, but Qsky and full element inputs remain bounded. |
| 2.44 | remains NOT_IMPLEMENTED | Delegated SR EN ISO 52016-1 Annex G dynamic procedure is not owned; no inference was made. |
| 2.45 | remains NOT_IMPLEMENTED | Delegated SR EN ISO 52016-1 Annex G dynamic procedure is not owned; no inference was made. |
| 2.46 | remains NOT_IMPLEMENTED | Delegated SR EN ISO 52016-1 Annex G dynamic procedure is not owned; no inference was made. |
| 2.50 | remains PARTIAL | Opaque solar gains still require Qsky and complete opaque element inputs. |
| 2.51 | promoted to COMPLETE | Single adjacent-zone gain reduction is implemented with explicit source-backed inputs and trace. |
| 2.52 | promoted to COMPLETE | Multiple adjacent-zone gain reduction is implemented with explicit source-backed inputs and trace. |
| 2.53 | promoted to COMPLETE | Internal unconditioned-zone insignificant-gains branch is implemented with explicit confirmation and trace. |
| 2.54 | remains PARTIAL | Qsky can be supplied explicitly; automatic source-backed sky-radiation preprocessing remains bounded. |
| 2.87 | remains PARTIAL | P7D implemented the explicit threshold equation; graphic annual heating/cooling period intersection remains procedural future work. |

## Internal-Gain Architecture

Before P7E:

- Building DNA stored monthly `internalGainsKwh` as an explicit monthly input.
- Source-backed Romanian climate profiles could still produce zero internal gains when the building-use category or area was not wired at profile-generation time.
- Table 2.15 existed as a lookup but did not own a complete monthly derivation path with trace, provenance, resolver integration and report coverage.

After P7E:

- `src/physics-engine/mc001InternalGainsCalculation.mjs` calculates monthly internal gains from MC001 Tabel 2.15:
  `Qint = qint * Ause * t / 1000`.
- Building DNA resolves internal gains from:
  building type / use category / expert category override + useful floor area + monthly duration.
- Supported Table 2.15 categories are:
  `residential_collective`, `residential_single_family`, `administrative`, `schools`, `hospitals`.
- Unsupported categories produce `INTERNAL_GAINS_TABLE_2_15_CATEGORY_AND_AREA_REQUIRED` instead of a silent production zero.
- Provenance records the category, table, section, page, formula id, production eligibility and execution trace.

## Adjacent-Zone Architecture

Before P7E:

- Adjacent-zone helper formulas existed behind explicit inputs, but the production Chapter 2 monthly chain did not expose enough execution-trace evidence.

After P7E:

- Monthly heat-gains runtime accepts `adjacentUnconditionedZones`.
- Relation 2.34 and 2.37 contributions are traced as:
  `(1 - bztu) * FztcZtu * fgnMax * QdirZtu`.
- Relation 2.51 and 2.52 gain-reduction factors are traced from the explicit heat-transfer/temperature inputs.
- Relation 2.53 is represented as an executed branch requiring explicit insignificant-gains confirmation.
- Chapter 2 orchestration propagates the resulting heat-gains trace into heating and cooling useful-demand case results.

## Building Type Contract

P7E avoids a new detached-house-only assumption. Internal gains can be driven by
canonical use/category identifiers for detached houses, apartments, apartment
buildings, offices/administrative buildings, schools and hospitals. Commercial
building categories not present in owned Table 2.15 remain explicit expert-input
contracts.

## Report and Notebook Contract

- Monthly QHgn report/notebook rows now render the runtime execution trace.
- If a heat-gains trace is absent, the report shows `Execution trace unavailable.`
  rather than silently reconstructing a generic expression.
- Internal-gain Table 2.15 derivations are report-visible when present.

## Regression Protection

Preserved P7B/P7C solar behavior:

- A.9.6 to Hsol remains source-backed and locality-specific.
- `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED` remains the active solar blocker.
- `CHAPTER_2_SOLAR_PREPROCESSING_UNAVAILABLE` remains absent from active runtime output.
- No Qsol or Qsky value is fabricated.

## Tests Added or Extended

- `src/physics-engine/tests/mc001InternalGainsCalculation.test.mjs`
- `src/physics-engine/tests/mc001MonthlyHeatGainsCalculation.test.mjs`
- `src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs`
- `src/building-platform/tests/buildingDnaResolver.test.mjs`
- `src/building-platform/tests/buildingTechnicalReport.test.mjs`
- `tests/p7c-chapter2-coverage-matrix.mjs`

## Remaining Normative Dependencies

- Automatic `Qsol/Qsky` completion for project solar elements.
- SR EN ISO 52016-1 Annex G dynamic transparent-element procedure for relations 2.44-2.46.
- Complete official locality-to-climate-zone mapping where not already represented by implemented station-backed production profiles.
- Procedural annual heating/cooling period intersection downstream of relation 2.87.

## Chapter 2 Closure Assessment

For the supported production scope, Chapter 2 now has a coherent explicit-input
and provider-backed calculation path for envelope, transmission, ventilation,
internal gains, adjacent-zone gain corrections, utilization factors, useful
heating/cooling demand, latent demand and annual aggregation.

Chapter 2 should not yet be declared fully complete for all MC001 functionality:
the solar Qsol/Qsky chain and SR EN ISO 52016-1 Annex G delegated dynamic
transparent-element procedure remain bounded by missing normative source or
missing source-backed input contracts.
