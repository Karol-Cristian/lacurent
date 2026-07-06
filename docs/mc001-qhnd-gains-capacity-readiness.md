# MC001 C6D Gains, Capacity, And Time-Constant Readiness

## Scope

C6D is a metadata-only readiness milestone for MC001-2022 heat gains, effective internal heat capacity, and heating time-constant dependencies needed before monthly useful heating demand runtime work.

It does not implement `QH;nd`, does not change Worker/API/UI behavior, does not add migrations or configuration, and does not claim final energy, primary energy, CO2, CPE, or certificate readiness.

## Why C6D Exists After C6A/C6B/C6C

C6A mapped the broad monthly useful-energy spine. C6B transcribed figure 2.18 heating branch metadata and left the first heating branch ambiguous. C6C transcribed heating utilization-factor metadata from figure 2.14 and relation 2.57, but kept gains and effective capacity as unresolved source dependencies.

C6D narrows those unresolved dependencies:

- internal gains from section 2.7.2;
- solar gains from section 2.7.3;
- effective internal heat capacity from section 2.7.5 and tables 2.19/2.20;
- heating time constant from relation 2.57;
- one more source-backed review of the figure 2.18 first heating branch.

## Exact Source Map

Source used: MC001-2022 only, inspected through the existing local source maps and extraction notes based on the official local PDF. The PDF is not copied into this milestone and is not read by runtime code.

| Reference | Page | Role |
| --- | ---: | --- |
| 2.7.2 | 103-104 | Total heat gains and internal gains |
| Figure 2.13 | 103 | Total gains dependency, `QH;gn = QH;int + QH;sol` |
| Relations 2.33-2.35 | 103-104 | Internal gains candidate relations and component dependencies |
| 2.7.3 | 104-112 | Solar gains dependencies |
| Relations 2.36-2.38 | 104-105 | Solar gains direct/adjacent-zone/component relations |
| Relation 2.39 | 105 | Transparent element solar gains |
| Relation 2.50 | 111 | Opaque element solar gains, as recorded in the existing MC001 extraction note |
| 2.7.5 | 112 | Effective internal heat capacity source section |
| Tables 2.19 and 2.20 | 112 | Effective capacity class/value dependencies, not encoded as values |
| Relation 2.57 | 116 | Heating time constant |
| Figure 2.18 | 120 | Heating monthly useful demand branch ambiguity review |

## Internal Gains Transcription/Readiness

| Candidate | Source | Expression or dependency | Readiness |
| --- | --- | --- | --- |
| Single-zone internal gains | Relation 2.33 | `QH/C;int;ztc;m = QH/C;int;dir;ztc;m` | verified for future runtime with explicit inputs |
| Adjacent unconditioned-zone internal gains | Relation 2.34 | Direct gains plus `bztu`, `Fztc;ztu`, `fgn;max`, and adjacent direct gains terms | needs human visual review / source-pack support |
| Direct internal gains components | Relation 2.35 | Occupants, appliances, lighting, water/DHW, HVAC, process/goods components times useful area | referenced, not runtime-ready |

Required future inputs include explicit monthly internal gains, or source-backed component values for `QH/C;spec;int;oc/A/L/WA/HVAC/proc;zt;m`, useful area `Ause;zt`, and any adjacent-zone correction/distribution factors.

No occupancy, schedule, appliance, lighting, water/DHW, HVAC, process, or building-use default values are encoded in C6D.

## Solar Gains Transcription/Readiness

| Candidate | Source | Expression or dependency | Readiness |
| --- | --- | --- | --- |
| Single-zone solar gains | Relation 2.36 | `QH/C;sol;ztc;m = QH/C;sol;dir;ztc;m` | verified for future runtime with explicit inputs |
| Adjacent unconditioned-zone solar gains | Relation 2.37 | Direct solar gains plus `bztu`, `Fztc;ztu`, `fgn;max`, and adjacent direct solar terms | needs human visual review / source-pack support |
| Direct solar gains components | Relation 2.38 | Transparent plus opaque solar gains | verified for future runtime with explicit inputs |
| Transparent solar gains | Relation 2.39 | glazing transmittance, area, frame fraction, shading, irradiation, and sky term | verified for future runtime with explicit inputs |
| Opaque solar gains | Relation 2.50 | absorptance, exterior resistance, U-value, area, shading, irradiation, and sky term | verified for future runtime with explicit inputs |

Solar runtime remains blocked for source-backed mode until orientation, tilt, area, glazing properties, frame factor, shading, monthly solar irradiation, sky radiation, absorptance, surface resistance, and climate/solar data are source-packed or supplied explicitly.

No solar irradiation, climate data, shading, glazing, absorptance, or orientation defaults are encoded in C6D.

## Effective Capacity And Time Constant

| Candidate | Source | Dependency | Readiness |
| --- | --- | --- | --- |
| Effective internal heat capacity `Cm;eff;ztc` | Section 2.7.5 | explicit input or future source pack | source dependency only |
| Effective capacity tables | Tables 2.19 and 2.20 | table values/class logic | referenced but not transcribed into runtime values |
| Heating time constant `tauH;ztc;m` | Relation 2.57 | `Cm;eff;ztc`, excluding-ground transmission, adjusted ground, and ventilation coefficients | verified for future runtime with explicit inputs |

The time-constant relation can be represented as future runtime metadata only if all its inputs are explicit and source-traced. The table values behind `Cm;eff;ztc` are not encoded as defaults.

## Figure 2.18 First-Branch Ambiguity Review Result

C6D revisits the first heating branch only using the MC001-2022 source-backed evidence already available in the readiness chain.

Observed condition remains:

`gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1`

Verdict: unresolved visual/logical notation ambiguity.

Decision: do not infer intended meaning from external standards or memory. The first branch remains blocked for runtime use.

## Symbol Table

| Symbol | Meaning | Unit | Dependency origin |
| --- | --- | --- | --- |
| `QH;gn;ztc;m` | Total monthly heat gains for heating mode | kWh | explicit input required or future gains source pack |
| `QC;gn;ztc;m` | Total monthly heat gains for cooling mode | kWh | missing future source pack |
| `QH/C;int;ztc;m` | Monthly internal gains | kWh | explicit input required |
| `QH/C;sol;ztc;m` | Monthly solar gains | kWh | explicit input required |
| `QH/C;spec;int;oc/A/L/WA/HVAC/proc;zt;m` | Specific monthly internal gain components | kWh/m2 | missing future source pack |
| `Ause;zt` | Useful floor area | m2 | explicit input required |
| `QH/C;sol;wi;k;m` | Transparent element solar gains | kWh | missing future source pack |
| `QH/C;sol;op;k;m` | Opaque element solar gains | kWh | missing future source pack |
| `Hsol;wi;m`, `Hsol;k;m` | Monthly solar irradiation | kWh/m2 | missing climate/solar source pack |
| `Cm;eff;ztc` | Effective internal heat capacity | J/K | explicit input or future source pack |
| `tauH;ztc;m` | Heating time constant | h | explicit input possible after coefficient inputs are available |

## Candidate Formulas

| Candidate | Source | Readiness |
| --- | --- | --- |
| Total heat gains | Figure 2.13 | future runtime only with explicit `QH;int` and `QH;sol` |
| Internal gains single-zone path | Relation 2.33 | future runtime only with explicit direct internal gains |
| Internal gains adjacent-zone path | Relation 2.34 | blocked until adjacent-zone factors are source-packed |
| Direct internal gains components | Relation 2.35 | referenced, but component/source tables and schedules are not encoded |
| Solar gains single-zone path | Relation 2.36 | future runtime only with explicit direct solar gains |
| Solar gains adjacent-zone path | Relation 2.37 | blocked until adjacent-zone factors are source-packed |
| Direct solar gains components | Relation 2.38 | future runtime only with explicit transparent/opaque gains |
| Transparent solar gains | Relation 2.39 | future runtime only with explicit glazing, geometry, shading, irradiation, and sky inputs |
| Opaque solar gains | Relation 2.50 | future runtime only with explicit absorptance, resistance, U-value, area, shading, irradiation, and sky inputs |
| Effective capacity tables | Tables 2.19/2.20 | source dependency only; no values encoded |
| Heating time constant | Relation 2.57 | future runtime only with explicit `Cm;eff`, transfer coefficients, ground adjustment, and ventilation coefficient |

## Dependency Matrix

| Dependency | Status |
| --- | --- |
| C5 explicit transfer total | implemented, explicit transfer only |
| `QH;ht` monthly input | explicit-input-only or C5 chain |
| Internal gains | explicit-input-only or missing future source pack |
| Solar gains | explicit-input-only or missing future source pack |
| Total gains `QH;gn` | explicit-input-only or missing future source pack |
| `gammaH` | verified for future runtime in R5 |
| `etaH;gn` | partially verified; zero-edge review still needed |
| Effective capacity `Cm` | explicit-input-only or missing future source pack |
| Time constant `tau` | verified for future runtime with explicit inputs |
| Figure 2.18 first branch | blocked by unresolved ambiguity |
| `QH;nd` runtime | not implemented |
| Annual `QH;nd` aggregation | not implemented |
| Final energy | blocked |
| Primary energy | blocked |
| CO2 | blocked |
| CPE/certificate | blocked |

## Runtime Readiness Verdict

C6E cannot safely implement a heating-only `QH;nd` explicit-input runtime calculator yet.

Even with explicit `QH;ht`, explicit gains, and explicit time-constant inputs, runtime remains blocked by the unresolved figure 2.18 first branch and the figure 2.14 non-positive-gamma zero-edge review.

## What Remains Blocked

- Runtime `QH;nd`.
- Runtime `QC;nd`.
- Final energy, primary energy, CO2, CPE, and certificate output.
- System losses and final system accounting.
- Hidden fallback values.
- Normative internal-gains values.
- Normative solar or climate data.
- Normative effective-capacity table values.
- Default occupancy, schedules, or use categories.
- Long unoccupied-period and intermittent-operation runtime behavior.

## Recommendation For Next Phase

Recommendation B: C6E must continue source extraction or human visual review before runtime QHnd implementation.

The next narrow step should resolve the figure 2.18 first branch and the figure 2.14 non-positive-gamma zero edge. If those are resolved, a later implementation slice can consider a heating-only explicit-input calculator that accepts explicit `QH;ht`, explicit `QH;gn`, explicit `Cm/tau` inputs, and refuses all hidden defaults.
