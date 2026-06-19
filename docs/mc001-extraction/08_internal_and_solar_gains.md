# 08 Internal and Solar Gains

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:

- MC001-2022, 2.7.2 - Aporturi de caldura totale si aporturi interne
- MC001-2022, Figura 2.13
- MC001-2022, 2.7.3 - Aporturi solare
- MC001-2022, relatiile (2.33), (2.34), (2.35), (2.36), (2.37), (2.38), (2.39), (2.50)

Extraction status: `partial_needs_external_data`

Implementation relevance:

- This module provides the monthly gain terms needed by `07_monthly_heating_cooling_demand`.
- It extracts formulas for monthly internal gains, monthly solar gains, transparent solar gains, and opaque solar gains.
- It does not provide complete default/normative datasets for occupancy gains, solar irradiation, shading, absorptance, glazing properties, frame fractions, sky radiation, or adjacent-zone factors.

LaCurent disclaimer:

- This extraction supports a MC001-like Physics Engine.
- It is not sufficient for issuing an official energy performance certificate.
- Calculators must not invent missing gain inputs.

## Concepts to extract

Internal heat gains:

- Heat gains from occupants, appliances, lighting recoverable losses, water/domestic hot water recoverable losses, HVAC recoverable losses, processes, and goods.
- In the monthly method they contribute to `Qint`.

Solar heat gains:

- Heat gains caused by solar radiation entering or affecting the thermal zone.
- In the monthly method they contribute to `Qsol`.

Transparent element solar gains:

- Solar gains through windows or other transparent elements.
- They depend on glazing solar transmittance, area, frame fraction, shading, solar irradiation, orientation/tilt, and sky radiation correction.

Opaque element solar gains:

- Solar gains through opaque envelope elements.
- They depend on absorptance, exterior surface resistance, U-value, projected area, shading, solar irradiation, and sky radiation correction.

Monthly gains:

- Internal and solar gains are monthly values.
- They feed the heating/cooling useful demand balance through `Qgn`.

Total gains `Qgn`:

- `Qgn` is the sum of internal and solar gains.
- `Qgn` must remain separate from `Qht` and from final energy.

Missing gains behavior:

- Missing gains must not silently become zero unless this is explicitly configured and traced.
- Missing gains should normally block a high-confidence MC001 monthly demand calculation.

## Formula registry entries

### Formula 1 - Monthly total gains

| Field | Value |
| --- | --- |
| formulaId | `MC001_MONTHLY_TOTAL_GAINS` |
| labelRo | Aporturi totale lunare de caldura |
| formulaText | Heating: `QH;gn;ztc;m = QH;int;ztc;m + QH;sol;ztc;m`; Cooling: `QC;gn;ztc;m = QC;int;ztc;m + QC;sol;ztc;m` |
| unit | `kWh` |
| output | `QgnMonthly` |
| inputs | `QintMonthly`: aporturi interne lunare `[kWh]`; `QsolMonthly`: aporturi solare lunare `[kWh]` |
| MC001 reference | MC001-2022, 2.7.2, Figura 2.13 |
| formulaStatus | `extracted_unnumbered` |
| implementationAllowed | `true` |
| implementation notes | Cross-reference to `07_monthly_heating_cooling_demand`; do not duplicate implementation. |
| validation notes | `QintMonthly >= 0`; `QsolMonthly >= 0` unless a sourced correction term produces a lower net solar contribution. |

### Formula 2 - Internal gains monthly

| Field | Value |
| --- | --- |
| formulaId | `MC001_INTERNAL_GAINS_MONTHLY` |
| labelRo | Aporturi interne lunare |
| formulaText | Single conditioned zone or conditioned adjacent zones: `QH/C;int;ztc;m = QH/C;int;dir;ztc;m`. With adjacent unconditioned zones: `QH/C;int;ztc;m = QH/C;int;dir;ztc;m + sum_k((1 - bztu,k;m) x Fztc;ztu,k;m x fgn;max;H;ztu,k;m x QH/C;int;dir;ztu,k;m)`. Direct internal gains: `QH/C;int;dir;zt;m = (QH/C;spec;int;oc;zt;m + QH/C;spec;int;A;zt;m + QH/C;spec;int;L;zt;m + QH/C;spec;int;WA;zt;m + QH/C;spec;int;HVAC;zt;m + QH/C;spec;int;proc;zt;m) x Ause;zt` |
| unit | `kWh` |
| output | `QintMonthly` |
| inputs | `QH/C;int;dir;ztc;m`: direct monthly internal gains for conditioned zone `[kWh]`; `bztu,k;m`: adjacent unconditioned zone correction factor `[-]`; `Fztc;ztu,k;m`: distribution factor `[-]`; `fgn;max;H;ztu,k;m`: reduction factor to avoid overestimated gains `[-]`; `QH/C;int;dir;ztu,k;m`: direct internal gains in adjacent unconditioned zone `[kWh]`; `QH/C;spec;int;oc/A/L/WA/HVAC/proc;zt;m`: monthly specific internal gains by source `[kWh/m2]`; `Ause;zt`: useful floor area of zone `[m2]` |
| MC001 reference | MC001-2022, 2.7.2, relatiile (2.33), (2.34), (2.35) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Do not invent monthly specific gains. Components must come from MC001 tables/procedures, explicit input, or another reviewed extraction module. Adjacent-zone terms require sourced `bztu`, distribution, and reduction factors. |
| validation notes | `Ause;zt > 0`; specific gain components must be sourced; unit normalization must be explicit because explanatory text may discuss Wh/m2 before monthly conversion. |

### Internal gains data procedure

MC001-2022, 2.7.2, text immediately after relation (2.35), states that monthly values of `QH/C;spec;int;x;zt;m` are determined from available sources. If the heat sources and their emission durations are known, the energy dissipated during the calculation timestep should be calculated. The same text describes a monthly averaging procedure based on heat flow, assigned useful area, and a time factor.

This is an extracted procedure, not a complete default table for all building categories. LaCurent must not create default internal gains until the relevant source values or category-specific tables are extracted.

### Formula 3 - Solar gains monthly

| Field | Value |
| --- | --- |
| formulaId | `MC001_SOLAR_GAINS_MONTHLY` |
| labelRo | Aporturi solare lunare |
| formulaText | Single conditioned zone or conditioned adjacent zones: `QH/C;sol;ztc;m = QH/C;sol;dir;ztc;m`. With adjacent unconditioned zones: `QH/C;sol;ztc;m = QH/C;sol;dir;ztc;m + sum_k((1 - bztu,k;m) x Fztc;ztu,k;m x fgn;max;H;ztu,k;m x QH/C;sol;dir;ztu,k;m)`. Direct solar gains: `QH/C;sol;dir;zt;m = sum_k(QH/C;sol;wi;k;m) + sum_k(QH/C;sol;op;k;m)` |
| unit | `kWh` |
| output | `QsolMonthly` |
| inputs | `QH/C;sol;dir;ztc;m`: direct monthly solar gains in conditioned zone `[kWh]`; `bztu,k;m`: adjacent unconditioned zone correction factor `[-]`; `Fztc;ztu,k;m`: distribution factor `[-]`; `fgn;max;H;ztu,k;m`: reduction factor `[-]`; `QH/C;sol;dir;ztu,k;m`: direct solar gains in adjacent unconditioned zone `[kWh]`; `QH/C;sol;wi;k;m`: solar gains through transparent element k `[kWh]`; `QH/C;sol;op;k;m`: solar gains through opaque element k `[kWh]` |
| MC001 reference | MC001-2022, 2.7.3, relatiile (2.36), (2.37), (2.38) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Solar gains require transparent and opaque element contributions. Adjacent-zone contribution must not be added unless adjacent unconditioned zone factors are known. |
| validation notes | Solar irradiation, orientation, tilt, shading, and element areas must be available before crediting solar gains. |

### Formula 4 - Solar gains through transparent elements

| Field | Value |
| --- | --- |
| formulaId | `MC001_SOLAR_GAINS_TRANSPARENT` |
| labelRo | Aporturi solare prin elemente transparente |
| formulaText | `QH/C;sol;wi;k;m = ggl;wi;H/C;m x Awi x (1 - Ffr;wi) x Fsh;obst;wi;m x Hsol;wi;m - Qsky;wi;m` |
| unit | `kWh` |
| output | `QsolTransparentMonthly` |
| inputs | `ggl;wi;H/C;m`: monthly mean effective total solar energy transmittance `[-]`; `Awi`: transparent element area `[m2]`; `Ffr;wi`: frame area fraction `[-]`; `Fsh;obst;wi;m`: external obstacle shading factor `[-]`; `Hsol;wi;m`: monthly solar irradiation on the tilted/oriented element `[kWh/m2]`; `Qsky;wi;m`: extra monthly heat flow due to thermal radiation to sky `[kWh]`; `betaWi`: tilt angle `[deg]`; `gammaWi`: orientation angle `[deg]` |
| MC001 reference | MC001-2022, 2.7.3, relatia (2.39) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | `Ffr;wi`, `Fsh;obst;wi;m`, `Hsol;wi;m`, `Qsky;wi;m`, `betaWi`, and `gammaWi` must be sourced. Do not invent shading or irradiation values. |
| validation notes | `Awi > 0`; `0 <= Ffr;wi < 1`; solar irradiation must match month, orientation, and tilt. |

### Formula 5 - Solar gains through opaque elements

| Field | Value |
| --- | --- |
| formulaId | `MC001_SOLAR_GAINS_OPAQUE` |
| labelRo | Aporturi solare prin elemente opace |
| formulaText | `QH/C;sol;op;k;m = alphaSr;k x Rse;k x Uc;op;k x Ac;k x Fsh;obst;k;m x Hsol;k;m - Qsky;k;m` |
| unit | `kWh` |
| output | `QsolOpaqueMonthly` |
| inputs | `alphaSr;k`: solar radiation absorptance `[-]`; `Rse;k`: exterior surface resistance `[m2K/W]`; `Uc;op;k`: opaque element thermal transmittance `[W/(m2K)]`; `Ac;k`: projected opaque area `[m2]`; `Fsh;obst;k;m`: external obstacle shading factor `[-]`; `Hsol;k;m`: monthly solar irradiation on the element `[kWh/m2]`; `Qsky;k;m`: extra monthly heat flow due to thermal radiation to sky `[kWh]` |
| MC001 reference | MC001-2022, 2.7.3, relatia (2.50) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Absorptance, exterior surface resistance, U-value, projected area, shading, irradiation, and sky radiation must be sourced. Do not apply opaque solar gains if these are missing unless the omission is explicitly traced. |
| validation notes | `Ac;k > 0`; `Rse;k > 0`; `Uc;op;k > 0`; `alphaSr;k` must be sourced; `Fsh;obst;k;m` must be sourced. |

## Required normative/data sources

| dataKey | neededFor | MC001 source | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- |
| `QH/C;spec;int;oc;zt;m` | occupant internal gains | MC001-2022, 2.7.2, relation (2.35) and following monthly averaging text | `external_module_needed` | `false` | Relation (2.35) identifies the component. The actual occupant heat flow, density/use, and schedule must come from explicit input, a reviewed table, or a later occupancy/use module. |
| `QH/C;spec;int;A;zt;m` | appliance internal gains | MC001-2022, 2.7.2, relation (2.35) | `external_module_needed` | `false` | Component is identified, but no complete default appliance dataset is extracted here. |
| `QH/C;spec;int;L;zt;m` | recoverable lighting losses | MC001-2022, 2.7.2, relation (2.35) | `external_module_needed` | `false` | Requires lighting system data or module `10_lighting`. |
| `QH/C;spec;int;WA;zt;m` | recoverable water/DHW/wastewater losses | MC001-2022, 2.7.2, relation (2.35) | `external_module_needed` | `false` | Requires DHW/system data or module `09_dhw_systems`. |
| `QH/C;spec;int;HVAC;zt;m` | recoverable HVAC losses | MC001-2022, 2.7.2, relation (2.35) | `external_module_needed` | `false` | Requires system losses from heating/cooling/ventilation modules. |
| `QH/C;spec;int;proc;zt;m` | process/goods gains | MC001-2022, 2.7.2, relation (2.35) | `external_module_needed` | `false` | Usually non-residential or process-specific; needs explicit source data. |
| monthly averaging procedure for internal gains | converting source heat flows and schedules into monthly specific gains | MC001-2022, 2.7.2, text after relation (2.35) | `extracted` | `true` | Usable only when source heat flow, occupied/use area, and emission duration are explicitly known. |
| building category / occupancy / use schedule defaults | default internal gains by category/use | MC001-2022, 2.7.2 references source-based values and monthly averaging | `needs_source_table` | `false` | No complete category default table was extracted from 2.7.2 in this module. |
| `Ause;zt` | scaling direct internal gains | MC001-2022, 2.7.2, relation (2.35); geometry definition in module `01_geometry_envelope_definitions` | `external_module_needed` | `false` | Must come from zone geometry. |
| `bztu,k;m` | gains from adjacent unconditioned zones | MC001-2022, 2.7.2 relation (2.34), 2.7.3 relation (2.37); adjacent-zone correction also referenced by ventilation module `06_ventilation_and_infiltration` | `external_module_needed` | `false` | Do not apply adjacent-zone gains without sourced `bztu`. |
| `Fztc;ztu,k;m` | distribution of adjacent-zone gains | MC001-2022, 2.7.2 relation (2.34), 2.7.3 relation (2.37) | `needs_source_table` | `false` | Formula references the factor, but no complete value source was extracted here. |
| `fgn;max;H;ztu,k;m` | reduction to avoid overestimated adjacent-zone gains | MC001-2022, 2.7.2 relation (2.34), 2.7.3 relation (2.37) | `needs_source_table` | `false` | Formula references the factor, but no complete value source was extracted here. |
| `Awi` | transparent solar gains | MC001-2022, 2.7.3, relation (2.39); envelope geometry modules `01` and `05` | `external_module_needed` | `false` | Window area must come from explicit envelope element geometry. |
| `betaWi`, `gammaWi` | solar irradiation by tilt/orientation | MC001-2022, 2.7.3, relation (2.39) variable definitions | `external_module_needed` | `false` | Orientation and tilt must come from geometry/envelope data. |
| `Hsol;wi;m` / `Hsol;k;m` | transparent and opaque monthly solar gains | MC001-2022, 2.7.3, relations (2.39) and (2.50) | `external_module_needed` | `false` | Monthly solar irradiation belongs in `17_climate_annex`; do not copy large climate/solar datasets here. |
| `Fsh;obst;wi;m` / `Fsh;obst;k;m` | shading/reduction for solar gains | MC001-2022, 2.7.3, relations (2.39) and (2.50) | `external_module_needed` | `false` | Shading factors require a dedicated shading/geometry source or referenced standard/module. |
| `ggl;wi;H/C;m` | effective glazing solar energy transmittance | MC001-2022, 2.7.3, relation (2.39) | `external_module_needed` | `false` | Requires glazing/shading property data; no default values extracted here. |
| `Ffr;wi` | frame area fraction | MC001-2022, 2.7.3, relation (2.39) | `external_module_needed` | `false` | Requires window/frame data or a reviewed default table. |
| `Qsky;wi;m` / `Qsky;k;m` | longwave sky radiation correction | MC001-2022, 2.7.3, relations (2.39) and (2.50), with immediately referenced sky-radiation calculation in 2.7.4 | `external_module_needed` | `false` | Should be extracted in a dedicated sky-radiation/climate submodule before implementation. |
| `alphaSr;k` | opaque solar absorptance | MC001-2022, 2.7.3, relation (2.50) | `external_module_needed` | `false` | Formula needs absorptance, but no absorptance table is extracted here. |
| `Rse;k` | opaque solar gain factor | MC001-2022, 2.7.3, relation (2.50); surface resistance concept in module `02_materials_lambda_R_U` | `external_module_needed` | `false` | Must come from a reviewed surface-resistance registry/module. |
| `Uc;op;k` | opaque solar gain factor | MC001-2022, 2.7.3, relation (2.50); envelope U-value modules `02` and `03` | `external_module_needed` | `false` | Must come from envelope calculation or explicit U-value. |
| `Ac;k` | opaque solar gain projected area | MC001-2022, 2.7.3, relation (2.50); geometry modules `01` and `05` | `external_module_needed` | `false` | Must come from explicit element geometry. |

## Required data model notes for future implementation

| gain component | required input | source | missing behavior |
| --- | --- | --- | --- |
| internal gains | occupancy/use, internal heat flow, monthly specific gain components, schedule or normative value | MC001 table/formula, reviewed extraction, or explicit input | missing blocks full monthly demand or lowers confidence only if explicit zero is configured and traced |
| transparent solar gains | window area, orientation, tilt, glazing properties, frame fraction, shading, monthly solar irradiation, sky radiation term | MC001 climate/solar data plus element data | missing blocks solar gain credit |
| opaque solar gains | opaque area, absorptance, U-value, external surface resistance, shading, monthly solar irradiation, sky radiation term | MC001 formula/table plus element data | missing gives no opaque solar credit only if explicitly traced |
| total gains | `Qint + Qsol` | calculated | cannot calculate `Qgn` if components are missing |

## Implementation implications for LaCurent

- `Qgn` cannot be calculated until `Qint` and `Qsol` are available.
- Useful area alone is not enough for solar gains.
- Window orientation, tilt, and area are required for transparent solar gains.
- Shading must be explicit or sourced.
- Solar irradiation values must come from climate/solar data, not inline defaults.
- Missing solar data should not silently become zero unless explicitly configured and traced.
- Internal gains require occupancy/use and source-specific monthly values or reviewed normative data.
- This module feeds `07_monthly_heating_cooling_demand`.
- Do not use annual HDD fallback.
- Formulas may be implementation-ready only when explicit inputs are supplied.
- Normative/default mode is not implementation-ready until required datasets are extracted.
- Solar irradiation/climate tables must be handled by a dedicated climate data module if not present locally in this section.
- Missing normative gain data should block default calculation, not silently use zero.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `09_dhw_systems` or `13_final_primary_co2_rer`, depending on priority.
