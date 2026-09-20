# LaCurent calculation validation campaign

Branch: `analysis/pbe-vertical-validation-20260920`  
Production source frozen at: `e8d5c00e01f68acb72f66e255168710caeb18e47`  
Production changes: **none**

## Objective

Quantify confidence in LaCurent Home Lab calculations by comparing controlled end-to-end user flows against PyBuildingEnergy (PBE) and by separately checking arithmetic/normative layers that PBE cannot independently validate.

## Fixed interpretation bands

For annual useful space-heating demand, compared cross-method:

- PASS: absolute difference <= 15%
- REVIEW: absolute difference > 15% and <= 25%
- INVESTIGATE: absolute difference > 25%

These are internal engineering criteria, not MC001 or ISO normative tolerances.

Relative intervention effects are also compared. A stable intervention response across methods is treated as separate evidence from absolute agreement.

## Campaign batches

### Batch 0 — adapter/reference sanity
Status: complete.

Purpose: prove the Light↔PBE adapter itself does not introduce artificial gains/losses.

Corrected Cluj reference chain:
- existing gas: PBE vs Light useful heat -7.0%
- renovated envelope gas: -3.8%
- renovated + HRV gas: -13.1%
- heat-pump downstream aligned-chain delta: -13.1%

The earlier larger discrepancy was traced to a PBE adapter internal-gains mapping issue and corrected.

### Batch 1 — climate × envelope × ventilation × heating system
Status: running.

Same 160 m² house in climate zones I–V:
- București — zone I
- Constanța — zone II
- Cluj-Napoca — zone III
- Brașov — zone IV
- Miercurea Ciuc — zone V

States:
1. existing envelope + gas
2. renovated envelope + gas
3. renovated envelope + HRV 80% + gas
4. same demand state + heat pump

Outputs:
- annual useful heating demand
- aligned main-carrier final energy
- Light and PBE climate diagnostics
- intervention effect by zone
- median / P90 / maximum absolute demand delta
- PASS / REVIEW / INVESTIGATE counts

### Batch 2 — geometry / glazing / orientation / airtightness
Planned.

Controlled dimensions:
- small / reference / large floor area
- compact vs less compact geometry
- low / high glazing ratio
- north / south dominant glazing
- low / medium / high ACH
- no HRV / HRV

Goal: detect nonlinear or geometry/solar edge-case bias.

### Batch 3 — heating carriers and system chains
Planned.

Where PBE supports an equivalent model without invented user inputs:
- condensing gas
- heat pump
- electric resistance
- biomass
- district heating

Direct native EN 15316 comparisons will only be used where the Home Lab input set is sufficient. Otherwise the comparison is explicitly marked aligned/arithmetic-only.

### Batch 4 — DHW and renewables
Planned.

Separate checks:
- DHW useful energy from occupants/litres/setpoint
- PV annual production against an independent PVGIS-compatible reference
- solar thermal annual contribution where a comparable model can be configured

Primary energy, CO2 and cost are audited separately because they depend on Romanian national factors and price datasets rather than on PBE physics alone.

### Batch 5 — measured-home reality check
Planned when measured cases are available.

Compare annual modeled consumption to real normalized bills/measurements for 5–10 homes. This is product-level validation, distinct from model-to-model verification.

## Final report

The final report will contain:
- exact input vector for every case
- Light result
- independent/aligned reference result
- absolute and percentage difference
- monthly/climate diagnostics where available
- intervention-effect comparison
- aggregate bias, median, P90, worst case
- repeated systematic patterns
- investigated root causes
- confidence map by calculation domain
- explicit limitations and non-equivalent quantities
- recommendation on any engine changes before production

No result from this campaign is merged into production automatically.
