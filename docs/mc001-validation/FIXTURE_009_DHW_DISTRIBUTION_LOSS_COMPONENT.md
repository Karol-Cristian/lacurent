# FIXTURE 009 - DHW Distribution Loss Component

## Status

- Fixture id: `FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT`
- Source candidate: `MC001_ANEXA_3_3_B_DHW_DISTRIBUTION_COMPONENTS`
- Executable: yes, as a narrowed component fixture.
- Validated module: `dhwDistributionLosses.mjs`
- Scope exclusions: no storage losses, no generator efficiency, no auxiliary-energy validation, no recovered-loss validation, no DHW final-energy calculation, no production integration, no UI, no workers, no DB/schema/API, no deploy, no push.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 page 260: relation (3.200), mean DHW distribution temperature.
- MC001-2022 page 260: relation (3.201), insulated pipe linear thermal transmittance.
- MC001-2022 page 261: relation (3.202), buried pipe linear thermal transmittance.
- MC001-2022 page 261: relation (3.203), uninsulated pipe linear thermal transmittance.
- MC001-2022 page 261: relation (3.204), approximate uninsulated pipe linear thermal transmittance.
- MC001-2022 Anexa 3.3.B pages 269-282: worked distribution example tables.
- Anexa 3.3.B page 270: pipe diameters, insulation conductivity, burial conductivity/depth, pipe material conductivity.
- Anexa 3.3.B page 272: displayed `Psi = 0.20 W/(mK)` and `Psiem = 0.21 W/(mK)`.
- Anexa 3.3.B page 273: displayed `Psinon = 0.97 W/(mK)` for exact and approximate paths.
- Anexa 3.3.B page 274: DHW water temperature `thetaW = 50 degC` and loop difference `deltaThetaW = 5 K`.
- Anexa 3.3.B page 277: exterior heat-transfer coefficient `ha = 8 W/(m2K)` for insulated pipes and `ha = 14 W/(m2K)` for uninsulated pipes.
- Anexa 3.3.B page 278: displayed `thetaW,em,mean = 47.5 degC`.

## Selected Formula Rows

Only rows whose inputs and expected component outputs are visible in Anexa 3.3.B are executable.

| Row | Formula | Inputs | Expected MC001 output | Tolerance |
| --- | --- | --- | ---: | ---: |
| Mean DHW distribution temperature | `thetaW,mean = thetaW - deltaThetaW / 2` | `thetaW = 50 degC`, `deltaThetaW = 5 K` | `47.5 degC` | exact |
| Insulated pipe transmittance | relation (3.201) | `di = 0.02 m`, `da = 0.06 m`, `lambdaD = 0.04 W/mK`, `ha = 8 W/m2K` | `0.20 W/(mK)` | `0.005` |
| Buried pipe transmittance | relation (3.202) | `di = 0.02 m`, `da = 0.06 m`, `lambdaD = 0.04 W/mK`, `lambdaem = 1 W/mK`, `z = 0.15 m` | `0.21 W/(mK)` | `0.005` |
| Uninsulated pipe transmittance, exact | relation (3.203) | `dp,i = 0.019 m`, `dp,a = 0.022 m`, `lambdap = 380 W/mK`, `ha = 14 W/m2K` | `0.97 W/(mK)` | `0.005` |
| Uninsulated pipe transmittance, approximate | relation (3.204) | `dp,a = 0.022 m`, `ha = 14 W/m2K` | `0.97 W/(mK)` | `0.005` |

The transmittance rows use a two-decimal source-display tolerance because Anexa 3.3.B displays the expected values rounded to two decimals.

## Calculated Values

| Row | Expected | Calculated from helper | Absolute delta | Percentage error |
| --- | ---: | ---: | ---: | ---: |
| Mean DHW distribution temperature | `47.5` | `47.5` | `0` | `0%` |
| Insulated pipe transmittance | `0.20` | `0.19863399389321662` | `0.0013660061067833906` | `0.6830030533916953%` |
| Buried pipe transmittance | `0.21` | `0.21107256240418676` | `0.0010725624041867665` | `0.5107440019936984%` |
| Uninsulated pipe transmittance, exact | `0.97` | `0.9675530520888385` | `0.0024469479111615122` | `0.2522626712537641%` |
| Uninsulated pipe transmittance, approximate | `0.97` | `0.9676105373056563` | `0.0023894626943437025` | `0.2463363602416188%` |

## Assumptions

- The Anexa 3.3.B displayed transmittance values are rounded to two decimals.
- `ha = 8 W/(m2K)` is used only for the insulated-pipe row because page 277 labels it for insulated pipes.
- `ha = 14 W/(m2K)` is used only for uninsulated-pipe rows because page 277 labels it for uninsulated pipes.
- The fixture does not use any SR EN 15316-3 length approximation formula as an expected output.

## Blocked Rows

`INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS` reviewed the annual/timestep basis for the visible energy rows and keeps them blocked.

| Row | Source | Classification | Reason |
| --- | --- | --- | --- |
| `QW,dis,ls = 0.225 kWh` | Anexa 3.3.B page 278 | `blocked_missing_effective_length` | Expected output is visible, but the exact effective length/equivalent-length basis for the DHW distribution and recirculation circuit is not cleanly traceable. The displayed DHW length gives `0.219972 kWh`; the expected value implies `L_eff = 32.6087 m`. |
| `QW,dis,stub = 135.8 kWh` | Anexa 3.3.B page 279 | `MC001_worked_example_inconsistency` | The mass-flow row is traceable, but the displayed energy is Wh-scale for `tci = 1 h` while the row is labeled `kWh`; no annual multiplier is displayed. |
| `QW,dis,nom = 7.3 kWh` | Anexa 3.3.B page 279 | `blocked_visual_formula_review_needed` | Relation (3.207) remains visually/symbolically sensitive and does not cleanly align with the page 279 mass-flow formula; the row has the same Wh/kWh scale issue as the stub row. |

Other rows outside the annual-basis investigation remain excluded:

| Row | Source | Reason |
| --- | --- | --- |
| Recoverable/recovered distribution losses | Anexa 3.3.B page 279 and related rows | Recovery factors and conditioned-space allocation are outside this component fixture. |

## Verification Notes

- The fixture validates distribution-loss component formulas only.
- It does not validate storage losses, generator efficiency, auxiliary energy, recovered losses, DHW final energy, or the Anexa B page 525 final-energy row.
- `dhwDistributionLosses.mjs` is intentionally limited to the component formulas above.
