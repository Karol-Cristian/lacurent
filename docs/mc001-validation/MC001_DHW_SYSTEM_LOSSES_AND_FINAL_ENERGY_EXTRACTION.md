# MC001 DHW System Losses And Final Energy Extraction

## Status

- Task id: `MC001_DHW_SYSTEM_LOSSES_AND_FINAL_ENERGY_EXTRACTION`
- Result: implementation blocked for an end-to-end DHW / ACS final-energy helper.
- Decision: no `dhwSystemLosses.mjs` helper is created in this task.
- Reason: MC001 provides a traceable subsystem energy-balance rule and several component formulas, but the complete final-energy chain still needs explicit distribution, storage, generation, auxiliary, carrier, and recovery inputs that are not fully cleaned into an executable fixture.

## Source Pages Inspected

| Source | Evidence inspected |
| --- | --- |
| PDF page 250 | DHW system subsystems and generic DHW subsystem energy-balance rule. |
| PDF pages 251-253 | Useful DHW demand context, temperatures, calculation periods, and special 40 percent source-efficiency cases for missing/precarious DHW installation. |
| PDF pages 257-258 | Water loss/waste volume penalty relation (3.197), zoning relations (3.198)-(3.199), and weighting dependency on SR EN 15316-1. |
| PDF pages 259-265 | Distribution losses, recoverable distribution heat, and auxiliary distribution energy relations (3.200)-(3.225). |
| PDF page 266 | Auxiliary recovery relations (3.226)-(3.227) and storage section 3.3.8 with relation (3.228). |
| PDF page 267 | Storage-term definitions and DHW generation section 3.3.9, which delegates generator calculation to section 3.1.5 / SR EN 15316-4-1. |
| PDF pages 269-282 | Anexa 3.3.B distribution-loss worked example data and calculated component outputs. |
| PDF pages 524-525 | Anexa B DHW / ACC school example inputs, useful demand, displayed distribution total, zero storage/generation/auxiliary rows, final energy, and primary energy. |

## Formula Chain Extracted

### 1. Generic DHW subsystem balance

MC001 page 250 gives the energy balance used for each DHW subsystem:

```text
QW,Y,in = QW,Y,out + QW,Y,ls - QW,Y,ls,rvd
```

Where `Y` is the subsystem being evaluated. This is traceable as an algebraic balance, but it requires explicit subsystem outputs, losses, and recovered losses. It does not by itself provide distribution, storage, or generation losses.

### 2. Useful demand already validated

Useful demand delivered to the user remains covered by `dhwUsefulDemand.mjs`:

```text
QW,nd = Vt * cW * rhoW * (thetaW,draw - thetaW,c) / 1000
```

This is before distribution, storage, generation, and auxiliary energy.

### 3. Optional upstream water loss/waste volume

Page 257 relation (3.197) can increase daily DHW volume for water loss/waste:

```text
VW,day + VW,ls,day = VW,day * f1 * f2
```

The coefficients depend on installation type and armature state. This affects useful volume/demand before system losses. It is not a final-energy conversion formula.

### 4. Distribution losses and recoveries

Pages 259-264 provide distribution-loss formulas, including:

```text
thetaW,mean = thetaW - deltaThetaW / 2
QW,dis,ls,total = QW,dis,ls + QW,dis,ls,nom + QW,dis,ls,stub
fW,dis,ls,rbl = QW,dis,ls,condispace / QW,dis,ls,total
QW,dis,ls,rbl = fW,dis,ls,rbl * QW,dis,ls,total
```

The component formulas need explicit pipe thermal transmittance, pipe lengths, equivalent lengths, ambient temperatures, recirculation/stub status, use counts, operation hours, pipe volumes, and sometimes consumption profiles. If lengths are not known, page 260 refers to SR EN 15316-3 Annex B2.3 approximations.

Relation (3.207) for recirculation loss without draw-off remains visually/symbolically sensitive in the extraction because the source-rendered sign and symbols need a dedicated formula review before code.

### 5. Distribution auxiliary energy

Pages 264-266 provide auxiliary formulas for pumps and heat tracing:

```text
PW,hydr,des = deltaPW,des * VdotW,des / 3600
deltaPW,des = (1 + fcomp) * RW,max * Lmax + deltaPW,add
WW,dis,hydr,an = PW,hydr,des * betaW,dis * tW,op,an * fW,corr
WW,dis,an = WW,dis,hydr,an * epsilonW,dis
epsilonW,dis = fW,e * (CP1 + CP2 * betaW,dis^-1) * EEI / 0.25
fW,e = PW,ref / PW,hydr,des
```

The formula path depends on pump/hydraulic/control inputs and external SR EN 15316-3 tables for several constants. Pages 265-266 also provide recovery of auxiliary energy:

```text
QW,dis,rbl = frbl,dis * WW,dis
QW,dis,rvd = frbl,dis * WW,dis
```

MC001 gives `frbl,dis` examples for pumps with/without thermal insulation, but the pump/system state must be explicit.

### 6. Storage losses

Page 266 relation (3.228) gives the annual simplified one-volume storage loss method. The visually reconstructed formula is:

```text
QW,sto,ls,tot =
  fsto,bac,acc * fsto,dis,ls * Hsto,ls *
  (thetaW,sto,set - thetaamb) * tci / 1000
```

Required terms include a stratification/control correction coefficient, a primary-agent distribution correction coefficient, storage wall transmittance `Hsto,ls`, storage setpoint, ambient temperature, and calculation hours. Page 267 states `Hsto,ls` is specified by the storage supplier/manufacturer. The correction coefficients depend on storage controls, dimensions, connections, pipe/valve insulation, or external procedures.

This is traceable as a formula, but not executable for Anexa B without explicit storage product/system inputs. The Anexa B DHW page displays `Qw,sto = 0`, but does not provide a storage calculation.

### 7. Generation losses and generator efficiency

Page 267 section 3.3.9 does not define a separate simple DHW generator-efficiency formula. It says the generator calculation, including losses and performance, is the same procedure described in section 3.1.5 and SR EN 15316-4-1 for heat generators, including fossil-fuel and biomass boilers. It also notes the procedure applies when the generator serves heating and DHW together or DHW alone.

Therefore DHW final energy cannot be computed from `QW,nd` by inventing a single efficiency. It needs the generator type, generator loss method, fuel carrier, possible shared heating/DHW allocation, auxiliary energy, and any storage/generation recoveries.

## Anexa B Page 525 Trace

Page 525 provides enough displayed subtotals to reconcile the DHW final row, but not enough to independently validate all loss formulas.

| Displayed row | Value |
| --- | ---: |
| `f` average daily consumption units | 300.00 |
| `Vw,f,day` specific demand | 5.00 l/unit,day |
| `Vw,day` daily DHW volume | 1500.00 l/day |
| `Vw,ls,day` water loss/waste volume | 645.00 l/day |
| `Qw,nd,annual, ZT1` | 18519.13 kWh/year |
| `Qw,nd,annual,spec., ZT1` | 13.52 kWh/m2.year |
| `Qw,dis,tot` | 19599 kWh |
| `Qw,sto` | 0 kWh |
| `Qw,g` | 0 kWh |
| `Ww` | 0 kWh |
| `Qw,total` final energy | 38118 kWh |
| `Qw,total` primary energy | 35069 kWhep |

Displayed final-energy reconciliation:

```text
18519.1 + 19599 + 0 + 0 = 38118.1 kWh
```

The 0.1 kWh difference against the displayed `38118 kWh` is display rounding. The primary row also reconciles through Fixture 008's Tabel 5.17 district-heating factor:

```text
38118 * 0.92 = 35068.56 kWhep
```

Validation policy: page 525 can support a future displayed-subtotal fixture, but it must not be treated as independent validation of distribution, storage, generation, or auxiliary formulas unless those intermediate physical inputs are cleaned and traced.

## Required Inputs By Stage

| Stage | Required inputs | Current status |
| --- | --- | --- |
| Useful demand | Volume, water density, water specific heat, draw and cold temperatures | Executable in `dhwUsefulDemand.mjs`. |
| Water loss/waste volume | Installation supply type for `f1`, armature state for `f2` | Traceable in Anexa B page 525 for displayed result only; not yet a helper. |
| Distribution loss | Pipe type, diameters, insulation, `Psi`, pipe lengths, equivalent lengths, ambient temperatures, operation time, recirculation/stub state, usage profile or simplified average temperature path | Formula text traceable, but full Anexa B physical inputs are not cleaned into a fixture. Some fallback lengths/constants depend on SR EN 15316-3. |
| Distribution recovery | Conditioned-space pipe lengths and total distribution loss | Formula text traceable; source-specific physical inputs not fully cleaned. |
| Distribution auxiliary | Pump design data, pressure drops, flow, load factor, operating time, hydraulic balancing factor, control constants, EEI, heat-tracing state | Formula text traceable; several inputs depend on system data or external SR EN 15316-3 tables. |
| Storage loss | Storage correction factors, `Hsto,ls`, storage setpoint, ambient temperature, hours | Formula traceable; product/system values missing for Anexa B. |
| Generation loss/final conversion | Generator type, section 3.1.5 calculation, SR EN 15316-4-1 inputs, carrier, shared heating/DHW allocation, generator auxiliary energy | Blocked; section 3.3.9 delegates to a broader generator model not extracted here. |
| Final energy by carrier | Thermal final energy, auxiliary electricity, carrier mapping, recovered-loss treatment | Page 525 has displayed values with `Ww = 0`; nonzero auxiliary handling remains unvalidated. |

## Executable Versus Blocked

Executable now:

- Useful DHW demand and daily-volume formulas (3.188)-(3.196), already implemented and tested.
- Tabel 3.3.1 specific-demand dataset lookup, already implemented and tested.
- Algebraic reconciliation of Anexa B page 525 displayed `Qw,total` from displayed `Qw,nd`, `Qw,dis,tot`, `Qw,sto`, and `Qw,g` values.

Not executable as a source-derived final-energy helper yet:

- Independent distribution-loss calculation for Anexa B page 525.
- Storage-loss calculation for Anexa B, because the page displays zero storage loss without storage calculation inputs.
- Generation-loss/final conversion, because MC001 3.3.9 delegates to section 3.1.5 / SR EN 15316-4-1 and no isolated DHW generator input fixture is cleaned.
- Auxiliary energy with nonzero `Ww`, because page 525 displays `Ww = 0` and does not validate the nonzero auxiliary path.

## Implementation Decision

Helper implementation is not justified in this task.

Reasoning:

- Creating a full `dhwSystemLosses.mjs` helper would require either unimplemented distribution/storage/generation submodels or accepting displayed losses as inputs.
- Accepting displayed losses as inputs would only validate an arithmetic subtotal, not the MC001 system-loss formulas.
- The task goal is to determine whether final energy can be computed from useful demand with traceable system losses. That remains blocked.

No Physics Engine formula change was made.

## Remaining Blockers

- Clean Anexa B DHW service schedule and monthly day/hour assumptions behind the displayed monthly `Qw,nd` rows.
- Independent calculation of page 525 `Qw,dis,tot = 19599 kWh` from pipe/system inputs.
- Dedicated review of relation (3.207) sign/symbol rendering before any recirculation-no-draw code.
- Storage product/system inputs for relation (3.228).
- Section 3.1.5 generator model extraction and a DHW-specific generator fixture.
- Nonzero DHW auxiliary electricity allocation by carrier.
- Rules for whether recovered DHW losses reduce DHW final energy, heating need, or both in a given source row.

## Recommended Next Validation Target

Next safest target: a dedicated Anexa 3.3.B DHW distribution-loss component fixture. It should validate only distribution and auxiliary component formulas where the example provides explicit pipe/system inputs, and it should remain separate from DHW final-energy validation until storage and generator inputs are traceable.

Alternative narrow target: a displayed-subtotal fixture for Anexa B page 525 that asserts only:

```text
Qw,total = Qw,nd + Qw,dis,tot + Qw,sto + Qw,g
```

That alternative must be labelled as a displayed arithmetic reconciliation, not as validation of the underlying system-loss formulas.
