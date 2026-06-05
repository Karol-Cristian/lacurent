# Physics Engine Unit Check

Data: 2026-06-05

Scope: verificare de unitati pentru lantul MC001-like al LaCurent Physics Engine. Nu s-au schimbat formule sau UI.

## Unit inventory

| Quantity | Expected unit | Current usage |
| --- | --- | --- |
| Area | `m2` | used in envelope, geometry, reports |
| Volume | `m3` | used for heated volume and airflow |
| Lambda | `W/mK` or `W/m.K` | material registries use lambda fields |
| R layer / R total | `m2K/W` | used in resistance calculators |
| U / U corrected | `W/m2K` | used in envelope calculators |
| Heat transfer coefficient | `W/K` | used for H element, Htr, Hve |
| ACH | `1/h` | used in ventilation |
| Airflow | `m3/h` | derived from ACH x volume |
| Air heat coefficient | `Wh/(m3K)` | constant `0.34`, not always unit-documented |
| Heating demand | `kWh/an` or `kWh/year` | mixed strings |
| Specific energy | `kWh/m2/an` or `kWh/m2.year` | mixed strings |
| CO2 | `kgCO2/an` | used |
| Specific CO2 | `kgCO2/m2/an` | used |

## Formula checks

| Formula | Expected units | Current implementation | Status |
| --- | --- | --- | --- |
| `R_layer = d / lambda` | `m / (W/mK) = m2K/W` | `resistance.ts`, `envelopeV02.ts`, `criticalMc001Chain.mjs` | ok, but missing inputs can return zero in some paths |
| `R_total = Rsi + sum(R_layer) + Rse` | `m2K/W` | implemented | ok |
| `U = 1 / R_total` | `W/m2K` | implemented | ok |
| `H_element = U x A` | `W/m2K x m2 = W/K` | implemented | ok |
| `H_tb = sum(psi x length)` | `W/mK x m = W/K` | implemented | ok in trace/v02; worker uses simplified perimeter x psi |
| `U_corrected = (U x A + H_tb) / A` | `(W/K) / m2 = W/m2K` | implemented in v02/critical chain | production worker sets corrected U equal to U and exposes bridge separately |
| `Htr = sum(U_corrected x A)` | `W/K` | implemented | naming differs when bridges are included separately |
| `airflowM3h = ACH x heatedVolumeM3` | `1/h x m3 = m3/h` | implemented | ok |
| `Hve = 0.34 x airflow x (1 - recovery)` | `Wh/(m3K) x m3/h = W/K` | implemented | ok, but constant source not centralized |
| `QH,nd = (Htr + Hve) x HDD x 24 / 1000` | `W/K x K.day x h/day / 1000 = kWh/year` | v02 and critical chain | production uses monthly balance instead |
| `finalEnergy = usefulDemand / seasonalEfficiency` | `kWh/year` | systems v04 | ok if efficiency is dimensionless |
| `heatPumpElectricity = usefulDemand / SCOP` | `kWh/year` | systems v04 via generation efficiency/SCOP-like preset | needs explicit trace clarity |
| `primaryEnergy = finalEnergy x primaryEnergyFactor` | `kWh final x kWh primary/kWh final = kWh primary` | implemented | factor sources diverge |
| `CO2 = finalEnergy x co2Factor` | `kWh final x kgCO2/kWh = kgCO2` | implemented | factor sources diverge |

## Formula differences found

1. Heating demand has two accepted internal variants.
   - Simplified annual HDD formula exists in `heatingDemandV02.ts` and `criticalMc001Chain.mjs`.
   - Production worker uses monthly heat balance with solar/internal gains.
   - Difference is expected, but output should declare method and formula ID clearly.

2. Corrected U and thermal bridges differ by path.
   - `envelopeV02.ts` and `criticalMc001Chain.mjs` can calculate `U_corrected = (U x A + H_tb) / A`.
   - Worker outputs `correctedUValueWm2K` equal to U and calculates `thermalBridgeLoss` separately.
   - This is acceptable only if labels make the distinction explicit.

3. Primary energy and CO2 factors differ by source.
   - Worker inline values are internal estimates.
   - New registries contain MC001-like user-provided values requiring official verification.
   - Current production path can therefore classify from a different factor set than the registry suggests.

## Unit issues found

| Issue | Risk | Recommended fix |
| --- | --- | --- |
| `kWh/an`, `kWh/year`, `kWh/m2/an`, `kWh/m2.year` are mixed | Harder testing and report consistency | Standardize internal units, allow localized display separately |
| `0.34` is not centralized in registry | Hidden normative/physical constant | Move to registry or formula metadata after confirmation |
| Missing `sourceType` on traces | Cannot separate user input / registry / estimate | Extend `CalculationTrace` |
| Missing production traces | Cannot audit exact displayed result | Add trace collection in worker path |
| Worker Htr excludes bridges but demand includes bridges | Inconsistent interpretation | Split labels: envelope Htr, bridge H, total transmission H |
| Primary/CO2 inline factors differ from registry | Class and CO2 can be wrong | Decide one source of truth |

## No automatic corrections

No unit fix was applied in this step. The issues above are documented for follow-up because some require user decisions about source of truth and official verification.
