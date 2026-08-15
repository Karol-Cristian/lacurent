# P7B Solar Preprocessing

## Normative Chain

P7B audits the owned source-backed path from `Mc001/1-2-3/2006 Anexa A.9.6` into the Chapter 2 solar quantities consumed by MC001-2022 relations 2.39, 2.50 and 2.54.

The owned source pack `validation-reference/source-packs/mc001-1-2006-annex-a9-6-solar-extract.json` contains 30 locality rows and 3960 checked cells for monthly mean daily total and diffuse solar irradiance in `W/m2`.

MC001-2022 2.7.3 states that `Hsol` for vertical orientations and horizontal surfaces is known from climatic data. P7B therefore exposes a source-backed `Hsol` dataset for the A.9.6 tabulated vertical and horizontal planes by unit integration:

`Hsol_m := I_T,A9.6,m * deltaT_m / 1000`

Example for Bucuresti, January, south vertical:

`Hsol_S,ian := 76.7 W/m2 * 744 h / 1000 = 57.0648 kWh/m2`

The implementation does not infer non-tabulated tilted surfaces and does not fabricate `Qsky`.

## Implemented

- `src/climate-platform/romanianNormativeClimateProvider.mjs` exposes `getRomanianNormativeMonthlyHsolFromAnnexA96`.
- `climateProvider.datasets.monthlyHsolVerticalHorizontal` is included in resolved climate selections.
- Building DNA compact provider envelopes preserve the Hsol dataset.
- Production ClimateProfile exposes `monthly_hsol_a9_6_vertical_horizontal`.
- Technical report and notebook show A.9.6 `Hsol` values with dataset version and provenance.
- Runtime eligibility distinguishes implemented `chapter2_hsol_vertical_horizontal` from bounded `chapter2_solar_gains`.

## Remaining Bounded Gap

`Qsol` is still not auto-generated from provider data alone. Source-backed automatic `Qsol` requires:

- `Qsky` or every MC001 2.54 input needed to calculate it;
- complete transparent/opaque solar element inputs: area, orientation, shading, glazing factor, frame factor, absorptance, exterior surface resistance and corrected U-value as applicable;
- SR EN ISO 52010-1 only for non-tabulated tilted-surface `Hsol` or other delegated climate-preprocessing branches not reproduced by MC001.

When those inputs are absent, production returns `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED` with `availableInputs: ["Hsol_vertical_horizontal_A9_6"]`, `missingInputs: ["Qsky", "Qsol", "solarElementInputs"]`, `productionEligible: false`, and context diagnostic `A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL`.

## Locality Coverage

All 30 localities present in A.9.6 are validated for twelve monthly Hsol records across the tabulated orientations:

`N`, `NE`, `E`, `SE`, `S`, `SV`, `V`, `NV`, and horizontal.

Stations outside A.9.6 continue to expose `MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION`.

## Validation Evidence

Focused validation added in P7B proves:

- exact Bucuresti Hsol values for January and July;
- finite twelve-month Hsol coverage for every A.9.6 locality;
- unsupported tilted orientation rejection;
- Building DNA and production ClimateProfile propagation;
- notebook/report Hsol visibility;
- Qsol/Qsky remains explicitly bounded rather than silently zeroed.

No Chapter 2, Chapter 3 or Chapter 4 formula was changed.
