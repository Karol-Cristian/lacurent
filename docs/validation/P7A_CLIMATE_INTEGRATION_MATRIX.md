# P7A Climate Integration Matrix

The machine-readable mapping is stored in `validation-reference/p7a-chapter2-ui-runtime-mapping.json`.

## Production Status

| Input | Provider status | Chapter 2 status | Diagnostic |
| --- | --- | --- | --- |
| Locality/station | implemented | connected to Building DNA | none |
| Climate zone | implemented | connected to requirements/diagnostics | none |
| Wind zone | implemented | connected where runtime needs it | none |
| Monthly exterior temperature | implemented | connected to transmission/ventilation | none |
| Monthly relative humidity | implemented | provider/report provenance only | cooling/ventilation design remains bounded where required |
| Winter/summer design temperatures | implemented | provider/report provenance | none for lookup |
| Annex A.9.6 solar source rows | implemented | source-backed `Hsol` available for tabulated vertical/horizontal planes | `A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL` |
| Chapter 2 solar gains `Qsol` | not source-backed from provider | blocked for production provider profiles until `Qsky/Qsol` and complete solar element inputs exist | `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED` |

## Production Eligibility Rule

Explicit monthly solar gains remain valid when supplied as explicit Building DNA inputs or deterministic fixtures. Source-backed Climate Provider profiles must not pass `provider_climate_profile_without_qsol_preprocessing` into Chapter 2 as zero. The adapter returns an incomplete result until certified `Qsol/Qsky` values and complete solar element inputs exist.
