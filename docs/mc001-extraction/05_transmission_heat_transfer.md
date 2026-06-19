# 05 Transmission Heat Transfer

Extraction status: `extracted`.

Source document:

- MC001-2022 - Metodologie de calcul al performantei energetice a cladirilor
- Local PDF: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

MC001 sections used:

- MC001-2022, 2.4.1 - calculation of thermal resistance/transmittance for opaque elements
- MC001-2022, relatia (2.15)
- MC001-2022, 2.7.1.1 - Transferul termic prin transmisie
- MC001-2022, relatia (2.27)
- MC001-2022, relatia (2.28)
- MC001-2022, 2.7.1.1, Figura 2.11

Implementation relevance:

This module defines transmission heat transfer coefficients and the monthly transmission transfer term needed later by monthly heating/cooling demand calculations.

LaCurent uses this extraction only for the estimative Physics Engine. It is not official certificate logic and must not be presented as an official energy performance certificate.

## Concepts To Extract

| Concept | Implementation meaning |
| --- | --- |
| coeficient de transfer termic prin transmisie | Heat transfer coefficient through the building envelope and relevant adjacent boundaries, expressed in `W/K`. |
| `Hd`: transfer direct catre exterior | Direct transmission path from conditioned/interior space to exterior through walls, roofs, exterior windows/doors and other exterior boundary elements. |
| `Hg`: transfer catre sol | Transmission path through ground-contact elements such as slabs on ground, basement floors or walls in contact with soil. |
| `Hu`: transfer prin spatii neincalzite | Transmission path through adjacent unheated spaces such as attic, basement, garage, stairwell or buffer zones. |
| `Ha`: transfer catre cladiri/spatii adiacente | Transmission path toward adjacent buildings or adjacent spaces, where applicable. |
| `Htr`: total transmission heat transfer coefficient | Aggregate of transmission paths: direct exterior, ground, unheated spaces and adjacent spaces. |
| monthly transmission transfer | Monthly heat transfer term using monthly coefficient, indoor calculation temperature, monthly outdoor temperature and month duration. |
| ground contact warning | Ground-contact transfer `Hg` must not be faked as plain direct exterior transfer because soil coupling has different physics and correction methods. |
| unheated zones warning | Unheated adjacent zones require correction factors or a separate adjacent-zone model; they should not be treated as exterior by default. |

## Formula Registry Entries

### Formula 1

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_15_HTR_TOTAL` |
| labelRo | Coeficient total de transfer termic prin transmisie |
| formulaText | `Htr = Hd + Hg + Hu + Ha` |
| unit | `W/K` |
| output | `Htr` |
| inputs | `Hd`: coeficient de transfer termic direct catre exterior `[W/K]`; `Hg`: coeficient de transfer termic catre sol `[W/K]`; `Hu`: coeficient de transfer termic prin spatii neincalzite `[W/K]`; `Ha`: coeficient de transfer termic catre cladiri/spatii adiacente `[W/K]` |
| MC001 reference | MC001-2022, 2.4.1, relatia (2.15) |
| implementation notes | `Htr` aggregates transmission paths. Do not merge ground-contact elements into `Hd` unless the method explicitly allows it. If `Hg/Hu/Ha` are not applicable, they may be zero with explicit applicability status. If they are applicable but missing, calculation should return missing input warnings. |
| validation notes | Each component must be `>= 0`. `Htr` must be `>= 0`. |

### Formula 2

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_27_HTR_EXCLUDING_GROUND` |
| labelRo | Coeficient global de transfer prin transmisie, exclusiv sol |
| formulaText | `HH/C;tr(excl.gr);ztc;m = Σ HH/C;el,k;m + Htr;tb;ztc` |
| unit | `W/K` |
| output | `HtrExcludingGround` |
| inputs | `HelK`: coeficient de transfer termic pentru elementul `k` `[W/K]`; `HtrTbZtc`: coeficient de transfer termic pentru punti termice `[W/K]` |
| MC001 reference | MC001-2022, 2.7.1.1, relatia (2.27) |
| implementation notes | Monthly method coefficient for elements not thermally coupled to ground. Ground-related transfer must be handled separately. |
| validation notes | `HelK >= 0`. `HtrTbZtc >= 0` unless sourced detailed data says otherwise. |

### Formula 3

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_28_HTR_THERMAL_BRIDGES` |
| labelRo | Coeficient global pentru punti termice |
| formulaText | `Htr;tb;zt = Σ(Ψtb,k × ltb,k)` |
| unit | `W/K` |
| output | `HtrTb` |
| inputs | `psiTbK`: transmitanta termica liniara a puntii termice `k` `[W/(mK)]`; `lTbK`: lungimea puntii termice `k` `[m]` |
| MC001 reference | MC001-2022, 2.7.1.1, relatia (2.28) |
| implementation notes | Monthly thermal bridge contribution for a thermal zone. Do not invent `psi` values. If bridge data is missing, return warning/lower confidence. |
| validation notes | `lTbK > 0`. `psiTbK` must be sourced. |

### Formula 4

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_FIG_2_11_MONTHLY_TRANSMISSION_TRANSFER` |
| labelRo | Transfer termic lunar prin transmisie |
| formulaText | Heating: `QH;tr;ztc;m = (HH;tr(excl.gr);ztc;m x (thetaIntCalcHztcM - thetaEAM) + Hgr;an;ztc;m x (thetaIntCalcHztcM - thetaEAAn)) x 0.001 x deltaTm`; Cooling: `QC;tr;ztc;m = (HC;tr(excl.gr);ztc;m x (thetaIntCalcCztcM - thetaEAM) + Hgr;an;ztc;m x (thetaIntCalcCztcM - thetaEAAn)) x 0.001 x deltaTm` |
| formulaStatus | `extracted_unnumbered` |
| implementationAllowed | `true` |
| unit | `kWh` |
| output | `QtrMonthly` |
| inputs | `HH;tr(excl.gr);ztc;m` / `HC;tr(excl.gr);ztc;m`: monthly transmission coefficient excluding ground `[W/K]`; `Hgr;an;ztc;m`: ground heat transfer coefficient `[W/K]`; `thetaIntCalcH/CztcM`: indoor setpoint temperature for heating/cooling `[°C]`; `thetaEAM`: monthly average outdoor temperature `[°C]`; `thetaEAAn`: annual average outdoor temperature `[°C]`; `deltaTm`: monthly duration `[h]` |
| MC001 reference | MC001-2022, 2.7.1.1, Figura 2.11 |
| implementation notes | The ground term is separate and uses annual exterior temperature. Do not collapse this into a single `Htr x deltaTheta` formula unless a later implementation explicitly derives an equivalent traced form. Do not use annual HDD fallback. Keep relation to Figure 2.11; no numbered relation was found for this figure formula. The previous generic `MC001_MONTHLY_TRANSMISSION_TRANSFER` should not be used for implementation unless rewritten as the exact Figure 2.11 formula. |
| validation notes | `HtrM >= 0`. `deltaTm > 0`. Temperatures must be numeric. |

## Applicability Model For LaCurent

| component | meaning | when applicable | missing behavior |
| --- | --- | --- | --- |
| `Hd` | direct exterior transmission | exterior walls, roof, exterior windows/doors, floors over exterior | missing blocks complete transmission calculation |
| `Hg` | ground transmission | slab on ground, basement walls/floors in contact with soil | if present but unmodeled, mark low confidence / missing ground method |
| `Hu` | unheated spaces | basement, attic, garage, unheated stairwell, enclosed buffer zones | require correction factor or separate adjacent-zone model |
| `Ha` | adjacent buildings/spaces | party walls or adjacent conditioned/unconditioned spaces where applicable | usually zero only if not applicable |

## Implementation Implications For LaCurent

- Transmission calculation needs explicit envelope elements.
- `usefulAreaM2` alone is not enough.
- `Htr` should be assembled from explicit components, not guessed from house area.
- Ground contact must be separate from direct exterior transmission.
- Thermal bridges must either be explicit or create warnings.
- Monthly method must use monthly exterior temperatures and monthly hours.
- This module does not calculate `QH,nd`; it only prepares transmission heat transfer terms.
- `QH,nd` belongs to `07_monthly_heating_cooling_demand`.

## Do Not Implement Yet

- no calculators created
- no production flow changed
- no UI changed
- no tests added
- next extraction module is `06_ventilation_and_infiltration`
