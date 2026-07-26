# Romanian Climate Infrastructure Audit

This report is generated from source-pack metadata and provider registries. It does not invent climate values.

## Coverage Summary

- Documents tracked: 6
- Documents present: 3
- Documents extracted: 3
- Datasets tracked: 12
- Datasets implemented: 11
- Datasets validated: 11
- MC001/6-2013 station mappings: 42
- Monthly temperature rows: 42
- Monthly humidity rows: 42
- Annex A.9.6 solar source rows: 30
- Bounded gaps: 4

## Documents

| Document | Edition | Present | Extracted | Implemented | Validated |
| --- | --- | --- | --- | --- | --- |
| mc001_2022 | 2022 | yes | yes | yes | yes |
| mc001_6_2013 | 2013 | yes | yes | yes | yes |
| mc001_1_2_3_2006_annex_a9_6 | 2006 | yes | yes | yes | yes |
| sr_en_iso_52010_1 | not bundled in repository | no | no | no | no |
| official_locality_to_climate_wind_zone_registry | not reproduced in MC001-2022 or MC001/6-2013 ingested sources | no | no | no | no |
| degree_day_dataset | not reproduced in the ingested MC001 sources | no | no | no | no |

## Dataset Coverage

| Dataset | Source | Records | Implemented | Runtime use |
| --- | --- | ---: | --- | --- |
| climate_zones_i_v | mc001_2022 | 5 | yes | zone-dependent requirements and winter design-temperature by zone |
| wind_zones_i_iv | mc001_2022 | 4 | yes | canonical metadata; no active Chapter 2/3 formula consumes wind-zone parameters yet |
| mc001_6_2013_locality_station_registry | mc001_6_2013 | 42 | yes | locality to MC001/6-2013 station selection |
| mc001_6_2013_monthly_exterior_temperature | mc001_6_2013 | 42 | yes | monthly transmission and ventilation climate input eligibility |
| mc001_6_2013_monthly_relative_humidity | mc001_6_2013 | 42 | yes | climate profile traceability and humidity-dependent future methods |
| mc001_6_2013_winter_design_day_temperature | mc001_6_2013 | 41 | yes | heating design climate profile field |
| mc001_6_2013_winter_design_pentad_temperature | mc001_6_2013 | 41 | yes | heating design climate profile field |
| mc001_6_2013_summer_design_day_temperature | mc001_6_2013 | 41 | yes | cooling/ventilation design climate profile field |
| mc001_6_2013_summer_design_pentad_temperature | mc001_6_2013 | 41 | yes | cooling/ventilation design climate profile field |
| mc001_1_2006_annex_a9_6_monthly_solar_irradiance | mc001_1_2_3_2006_annex_a9_6 | 30 | yes | source-backed solar irradiance identity and Hsol source rows for tabulated vertical/horizontal planes |
| mc001_1_2006_annex_a9_6_monthly_hsol_vertical_horizontal | mc001_1_2_3_2006_annex_a9_6 | 30 | yes | source-backed Hsol [kWh/m2] for A.9.6 tabulated vertical and horizontal planes |
| source_backed_qsol_qsky_completion | sr_en_iso_52010_1_or_explicit_qsky_solar_element_source | 0 | no | bounded Qsol completion from source-backed Hsol, Qsky-compatible inputs and complete solar element inputs |

## Representative Localities

| Locality | Station | Monthly temp | Humidity | A.9.6 solar | Winter design | Summer design |
| --- | --- | --- | --- | --- | --- | --- |
| Bucuresti | mc001_6_2013_bucuresti | yes | yes | yes | yes | yes |
| Cluj-Napoca | mc001_6_2013_cluj_napoca | yes | yes | yes | yes | yes |
| Iasi | mc001_6_2013_iasi | yes | yes | yes | yes | yes |
| Timisoara | mc001_6_2013_timisoara | yes | yes | yes | yes | yes |
| Constanta | mc001_6_2013_constanta | yes | yes | yes | yes | yes |
| Brasov | mc001_6_2013_brasov | yes | yes | no | yes | yes |

## Bounded Gaps

| Gap | Missing document | Missing clause/table | Blocked runtime calculation |
| --- | --- | --- | --- |
| source_backed_qsol_qsky_completion | SR EN ISO 52010-1 sau sursa explicita pentru Qsky/elemente solare | MC001 relation 2.54 hlr;e;k/Qsky-compatible inputs plus complete glazing/shading/surface inputs; SR EN ISO 52010-1 for non-tabulated tilted Hsol | source-backed Qsol from Annex A.9.6 rows, and QHnd/QCnd solar effect from that source-backed Qsol |
| automatic_locality_to_climate_zone_assignment | official locality/county to MC001 climate-zone assignment source | map/list behind MC001-2022 Figura 2.1 at locality or county resolution | automatic zone assignment; zone-dependent lookups still run with explicit zone selection |
| automatic_locality_to_wind_zone_assignment | official locality/county to wind-zone assignment source | wind-zone map/list referenced by MC001 forms | automatic wind-zone assignment; no active Chapter 2/3 formula currently consumes wind zone |
| degree_day_dataset | degree-day table/source if a degree-day method is selected | locality/station, base temperature and annual/monthly degree-day values | degree-day method only; current production uses monthly MC001 runtime |
