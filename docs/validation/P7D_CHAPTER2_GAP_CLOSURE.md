# P7D Chapter 2 Gap Closure

## Scope

- Base commit: `63d9b075e1c882c85024e24c125f046cda41abd4`
- Source basis: owned MC001-2022 official PDF plus existing machine-readable source packs.
- Production invariant: Chapter 2 useful-demand formulas, Chapter 3, Chapter 4 PV, P3V fixtures, numerical oracles and climate datasets are unchanged.
- Implementation scope: supplementary Chapter 2 relations that can be calculated deterministically from explicit or provider-backed inputs already represented by the production architecture.

## Coverage Delta

| Metric | Before P7D | After P7D |
| --- | ---: | ---: |
| Relation slots tracked | 87 | 87 |
| Formula-bearing relation slots | 85 | 85 |
| COMPLETE formulas | 52 | 67 |
| PARTIAL formulas | 14 | 15 |
| NOT_IMPLEMENTED formulas | 19 | 3 |
| Complete coverage | 61.2% | 78.8% |
| Complete or partial coverage | 77.6% | 96.5% |

## Implemented Relations

| Relation | Decision | Runtime | Notes |
| --- | --- | --- | --- |
| 2.4 | IMPLEMENTABLE_NOW | `calculateSurfaceTemperatureFactor2_4` | Implements both `fRsi = (theta_si - theta_e)/(theta_i - theta_e)` and `fRsi = (R - Rsi)/R`. |
| 2.16 | IMPLEMENTABLE_NOW | `calculateAverageCorrectedElementProperties2_16` | Area-weighted corrected U and reciprocal corrected R for one envelope element group. |
| 2.17 | IMPLEMENTABLE_NOW | `calculateAverageCorrectedEnvelopeProperties2_17` | Area-weighted corrected U and reciprocal corrected R for the complete envelope set. |
| 2.18 | IMPLEMENTABLE_NOW | `calculateThermalCouplingCoefficient2_18` | `L = A * U'` with explicit area and corrected U. |
| 2.19 | IMPLEMENTABLE_NOW | `calculateHeatFlow2_19` | `Phi = L * Delta theta`; signed heat flow is preserved. |
| 2.41 | IMPLEMENTABLE_NOW | `calculateDiffuseGlazingSolarTransmittance2_41` | Uses explicit `ggl,alt`, `ggl,dif`, and MC001 recommended or explicit `agl`. |
| 2.42 | IMPLEMENTABLE_NOW | `calculateMonthlyWindowShutterUValue2_42` | Weighted monthly U-value; delegated `Uw;sht` derivation remains an explicit/source-backed input. |
| 2.43 | IMPLEMENTABLE_NOW | `calculateMonthlyMovableShadingTransmittance2_43` | Weighted monthly glazing transmittance with explicit shading-use fraction. |
| 2.47 | IMPLEMENTABLE_NOW | `calculateObstacleShadingFactor2_47` | Uses explicit `Fsh,dir` and source-backed `fsol,dir` from Tables 2.17/2.18 where requested. |
| 2.48 | IMPLEMENTABLE_NOW | `calculateUnconditionedZoneSolarReduction2_48` | `Fsol,ue,ztu = ggl,ue,ztu * (1 - Ffr,ue,ztu)`. |
| 2.49 | IMPLEMENTABLE_NOW | `calculateUnconditionedZoneSolarGains2_49` | Explicit unconditioned-zone opaque-surface solar gains with source-backed Hsol. |
| 2.78 | IMPLEMENTABLE_NOW | `calculateCoolingOperativeTemperature2_78` | Downstream cooling operative-temperature output; does not change QCnd. |
| 2.79 | IMPLEMENTABLE_NOW | `calculateCoolingHeatTransferCoefficient2_79` | Inverts monthly cooling transfer using setpoint, exterior temperature and month duration. |
| 2.80 | IMPLEMENTABLE_NOW | `calculateAnnualOverheatingIndicator2_80` | Annual sum of monthly overheating indicators. |
| 2.81 | IMPLEMENTABLE_NOW | `calculateMonthlyOverheatingIndicator2_81` | Monthly overheating indicator from explicit OH gains, transfer and coefficients. |
| 2.87 | PARTIALLY_IMPLEMENTABLE | `calculateSeasonBoundaryOutdoorTemperature2_87` | Implements the explicit `theta_emz` threshold equation only; the graphic season-period intersection remains bounded. |

## Remaining Targeted Relations

| Relation | Classification | Reason |
| --- | --- | --- |
| 2.44 | EXTERNAL_STANDARD_DEPENDENCY | MC001 delegates the dynamic transparent-element monthly U weighted average to SR EN ISO 52016-1 Annex G. The owned source does not provide the state/hourly preprocessing procedure. |
| 2.45 | EXTERNAL_STANDARD_DEPENDENCY | MC001 delegates the dynamic transparent-element monthly g weighted average to SR EN ISO 52016-1 Annex G. No source-backed state/hourly preprocessing is available in the repository. |
| 2.46 | EXTERNAL_STANDARD_DEPENDENCY | MC001 delegates the dynamic transparent-element monthly `tau_sol` weighted average to SR EN ISO 52016-1 Annex G. P7D does not infer missing dynamic-state rules. |

## Solar Gap Policy

P7D preserves the certified P7C diagnostic contract:

- A.9.6 source-backed Hsol remains available and locality-specific.
- Qsky, Qsol completion and complete solar-element inputs remain bounded.
- `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED` remains the active production diagnostic.
- `CHAPTER_2_SOLAR_PREPROCESSING_UNAVAILABLE` must remain absent from active runtime output.

Relations 2.41-2.43 and 2.47-2.49 add explicit/source-backed helper calculations but do not fabricate missing Qsol/Qsky preprocessing.

## Validation Evidence

Added deterministic validation:

- `src/physics-engine/tests/mc001Chapter2SupplementaryRelations.test.mjs`

The tests cover:

- normal calculations;
- zero cases where meaningful;
- signed heat-flow behavior;
- invalid input rejection;
- table-backed obstacle shading;
- execution trace validation for every implemented helper;
- explicit bounded behavior for relation 2.87.

## Production Integration Notes

The implemented relations are production physics helpers. They are deliberately not exposed as raw mandatory UI fields because they are either:

- derived from existing envelope/runtime data;
- diagnostic/reporting outputs after useful-demand calculation;
- explicit expert inputs for specialized solar/shading cases.

This preserves the architecture rule:

primitive building description -> Building DNA/provider data -> normalized engineering input -> physics helper -> execution trace/report.

## Remaining Dependencies

| Dependency | Blocks |
| --- | --- |
| SR EN ISO 52016-1 Annex G | Full dynamic transparent-element relations 2.44-2.46. |
| Source-backed Qsky/Qsol preprocessing and complete solar element contracts | Automatic production solar gains for relations 2.36-2.39 and 2.50-2.54. |
| Graphic annual period intersection procedure | Full period determination downstream of relation 2.87. |

## Regenerated Artifacts

- `validation-reference/chapter2-coverage-matrix.json`
- `docs/validation/P7C_CHAPTER2_COVERAGE_AUDIT.md`
