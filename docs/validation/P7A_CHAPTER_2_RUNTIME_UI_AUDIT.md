# P7A Chapter 2 Runtime/UI Audit

Base commit: `f9187e1e3e3fc8325c12a120d7d38c587caf0798`.

Note: the solar blocker code recorded in this P7A audit is historical. P7B/P7C established source-backed A.9.6 `Hsol`, and the active production blocker is now `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED`.

## Defects Found

1. The report rendered a generic cooling balance for all months:
   `QCnd = QCgn - eta_Cht * QCht`.
   For the runtime branch `inverse_gammaC_greater_than_two_zero_demand`, the engine does not evaluate that balance; it returns zero by branch condition. The report therefore produced false lines such as `20 - 0 * 130 = 0`.

2. `formatNotebookNumber(null)` rendered as `0,0000` because JavaScript coerces `null` to `0`. Branch-only coefficients that were not required by the runtime could therefore appear as real zero coefficients.

3. Source-backed Climate Provider monthly temperature profiles carried `solarGainsKwh: 0` with provenance `provider_climate_profile_without_qsol_preprocessing`. The Chapter 2 adapter consumed that value as a real solar gain input. This made production locality profiles look complete even though source-backed automatic `Qsol/Qsky` completion was not available.

## Runtime/UI Path

UI locality selection resolves Building DNA location fields and the canonical Climate Provider station. Monthly exterior temperatures reach Building DNA and the Chapter 2 transmission/ventilation input path. Solar source rows from MC001/1-2006 Annex A.9.6 are present in the provider, but the normative preprocessing required to convert them to Chapter 2 solar gains remains bounded.

## Fixes

- Heating and cooling useful-demand runtimes now emit structured `mc001_execution_trace_v1` objects.
- The engineering notebook renders demand lines from the execution trace rather than reconstructing generic formulas.
- Branch results render the executed branch, condition and final value, and explicitly state that the general balance was not evaluated.
- Missing branch-only coefficients render as `--`, not `0,0000`.
- The Chapter 2 adapter blocks source-backed provider profiles before useful-demand execution when solar preprocessing is unavailable.
- The wizard blocked-state message now includes the causal blocker code.

## Remaining Normative Gap

Superseded historical blocker: `CHAPTER_2_SOLAR_PREPROCESSING_UNAVAILABLE`.

Active blocker: `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED`. MC001/1-2006 Annex A.9.6 now supplies source-backed vertical/horizontal `Hsol`; the remaining bounded chain is automatic completion of `Qsol/Qsky` and complete solar element inputs.
