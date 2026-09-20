# pyBuildingEnergy / ISO 52016 Cloudflare PoC

Status: experimental, isolated from the production calculation path.

## Purpose

Evaluate whether selected pyBuildingEnergy modules can be reused inside LaCurent,
while keeping Romanian MC001-2022 rules, climate mapping, reference-building and
NZEB logic, national primary-energy factors, prices and reporting in LaCurent.

The PoC deliberately decomposes the building-need calculation.  A full-engine
comparison would hide the source of a discrepancy.

## Upstream pin

pyBuildingEnergy version inspected: 2.0.3, BSD-3-Clause.

Pinned ISO 52016 execution slice:

- utils.py: `860d69105c5f371abc25db9f60dba17c66d056d4`
- ventilation.py: `110fc06cb6f623376456478c3025faa052c23c88`
- functions.py: `f20c6d7bb15d7f034ebc0b18f3981648e7efff66`
- table_iso_16798_1.py: `0849efcd85f634d8dd5ba2a837d0ae05b979ddbf`

The vendored upstream files are kept unmodified.  Adapter code lives outside the
vendor directory.

## Staged numerical comparison

All cases below use the same LaCurent demo geometry, the same monthly outdoor
temperatures expanded to an hourly audit year, no solar radiation and no
cooling/DHW.  Floor-to-ground is excluded until a dedicated ground-boundary
comparison is implemented.

| Stage | LaCurent heating | PBE ISO 52016 | Relative difference |
| --- | ---: | ---: | ---: |
| Above-ground envelope only | 12,569.921 kWh | 12,617.386 kWh | +0.378% |
| + ventilation + thermal bridges | 19,847.144 kWh | 19,692.302 kWh | -0.780% |
| + 4 W/m² constant internal gains, PBE default 40% convective | 15,321.800 kWh | 17,511.720 kWh | +14.293% |
| Same gain case, diagnostic 100% convective | 15,321.800 kWh | 14,791.045 kWh | -3.464% |

For the ventilation stage, both engines use exactly:

- H_ve = 73.44 W/K
- H_tb = 2.10 W/K

For the internal-gain stage, both receive exactly 640 W.  The PBE result column
confirms a 640 W mean internal gain.

The MC001 effective-capacity class was also aligned explicitly:

- class: medium
- effective internal capacity: 165,000 J/(m² K)
- total at 160 m²: 26.4 MJ/K

That alignment did not materially change the +14.3% default-PBE difference.
The current evidence therefore points to gain treatment/distribution as the
dominant source of divergence, not envelope conductance, ventilation, thermal
bridges or the gross effective-capacity value.

This is expected to be investigated rather than calibrated away: LaCurent's
current MC001 path is a monthly quasi-steady method using gain-utilization
factors, while the audited PBE path is an hourly dynamic calculation that
explicitly partitions internal gains between the air node and surfaces.

## Runtime / Cloudflare findings

The minimal vendored primary-energy PBE module executes correctly in the Python
Worker runtime and numerically matches LaCurent primary-energy accounting when
fed the same Romanian factors.

Observed PoC characteristics:

- NumPy in Worker: 2.2.5
- Pandas in Worker: 2.3.1
- minimal PBE primary-energy compute after warm-up: approximately 14 ms
- exact 8,760 h ISO 52016 audit on GitHub runner: roughly 7.5-10.5 s per run
- Worker bundle with NumPy/Pandas: approximately 47.1 MB
- eager NumPy/Pandas import failed Cloudflare startup-memory validation
- lazy loading allowed the isolated Worker to deploy
- first local request that cold-loaded the numerical stack was roughly 19 s
- subsequent minimal requests were tens of milliseconds

Conclusion: the complete hourly PBE calculation is not currently suitable for a
live Home Lab slider request inside the main Cloudflare Worker.

## Current architectural decision

Do not replace the production LaCurent MC001 engine yet.

Use pyBuildingEnergy in two roles:

1. validation oracle for staged physics comparisons;
2. source of selectively vendored ISO/EN system modules where they improve the
   model without forcing the complete scientific-Python stack into every request.

The Home Lab contract should remain independent of the engine implementation.

## Remaining validation gates

1. Diagnose internal-gain treatment month-by-month.
2. Add solar gains with matched monthly/directional energy before comparing
   annual results.
3. Compare ground/floor boundary handling separately.
4. Compare heating/cooling system-chain modules from EN 15316.
5. Revisit a production runtime only after the numerical kernel can be made
   substantially lighter or moved behind a non-interactive calculation boundary.

No production result should be labelled as pyBuildingEnergy/ISO52016-derived
until these gates are closed and the Romanian MC001 adapter is explicitly
validated.
