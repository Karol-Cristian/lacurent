# MC001 Chapter 4 Implementation Matrix

Milestone: `P7_MC001_CHAPTER_4_PRODUCTION_IMPLEMENTATION`

Source: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

## Production Scope

P7 implements the largest coherent Chapter 4 subset that can be completed with production quality in this milestone: MC001 4.5 photovoltaic monthly production, relations 4.160-4.165.

The implementation calculates physical PV production only. It does not allocate PV electricity to self-consumption or export, and it does not calculate primary energy, CO2, CPE, certificate indicators or RER.

## Chapter 4 Source Ranges

| Section | Romanian title | PDF pages | P7 status |
| --- | --- | --- | --- |
| 4.1 | Pompe de caldura | 288-303 | Deferred coherent domain; depends on SR EN 15316-4-2 and equipment performance data |
| 4.2 | Sisteme solare termice | 304-323 | Deferred coherent domain; collector/storage/load method requires a separate full subsystem |
| 4.3 | Sisteme de cogenerare | 324-338 | Deferred coherent domain and later-chapter interaction; depends on cogeneration standards and primary-energy allocation |
| 4.4 | Sisteme urbane pentru incalzire/racire | 339-353 | Deferred coherent domain and later-chapter interaction; district source weighting is not a standalone PV-style production method |
| 4.5 | Panouri fotovoltaice | 354-358 | Implemented production subset |
| 4.6 | Centrale eoliene | 359-362 | External standard dependency: SR EN 15316-4-10 |

## Implemented Photovoltaic Relations

| Relation | Runtime implementation | Test | Notebook/report |
| --- | --- | --- | --- |
| 4.160 `Atot = Np * Apanou` | `calculateMc001PvTotalCollectorArea` | `mc001Chapter4Photovoltaics.test.mjs` | `chapter4.pv.system.*` |
| 4.161 `epsilonPV = (Pmax,1000 / Apanou) / I1000` | `calculateMc001PvCollectorEfficiency` | `mc001Chapter4Photovoltaics.test.mjs` | `chapter4.pv.system.*` |
| 4.162 monthly electric energy | `calculateMc001PvMonthlyElectricEnergy` | `mc001Chapter4Photovoltaics.test.mjs` | `chapter4.pv.system.*` |
| 4.163 annual sum | annual aggregation in `calculateMc001Chapter4PhotovoltaicMonthlyProduction` | `mc001Chapter4Photovoltaics.test.mjs` | `chapter4.annual` |
| 4.164 monthly incident energy | `calculateMc001PvMonthlyIncidentEnergy` | `mc001Chapter4Photovoltaics.test.mjs` | `chapter4.pv.system.*` |
| 4.165 monthly capture efficiency | `calculateMc001PvMonthlyCaptureEfficiency` | `mc001Chapter4Photovoltaics.test.mjs` | `chapter4.pv.system.*` |

## Implemented Lookups

| Source | Values implemented | Runtime constant | Status |
| --- | --- | --- | --- |
| MC001-2022 Tabel 4.5 | Monthly `fcap` for tilt 45 deg and azimuth 0 deg | `MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0` | Implemented and unit tested |
| MC001-2022 Anexa A2 informativa | Monthly `eta_t` for monocrystalline PV | `MC001_CHAPTER4_PV_ANNEX_A2_MONOCRYSTALLINE_ETA_T` | Implemented and unit tested |
| MC001/1-2006 Anexa A9.6 | Monthly horizontal irradiance source rows | Climate Provider dataset | Implemented by climate infrastructure and consumed by PV runtime |

## Production Path

`Building DNA technicalSystems.renewableProduction.photovoltaic`

-> `buildingChapter4RenewablesAdapter.mjs`

-> Climate Provider monthly horizontal irradiance

-> `mc001Chapter4Photovoltaics.mjs`

-> `chapter4Result`

-> engineering notebook

-> technical report

-> immutable analysis/report versions.

The UI supplies explicit PV system inputs. The runtime rejects missing panel data, inverter efficiency, temperature efficiency and orientation correction; no hidden PV defaults are applied by the adapter.

## Known Boundaries

- Heat pumps, solar thermal, cogeneration and district systems are not partially implemented in P7.
- Wind production remains dependent on SR EN 15316-4-10 source-backed data.
- PV production is not credited into primary energy, CO2, CPE, certificate indicators, export or RER.
- Other PV tilt/azimuth correction rows are not inferred from geometry. They require source-backed lookup extension.
