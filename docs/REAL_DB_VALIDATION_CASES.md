# Real DB Validation Cases

Data: 2026-06-05

Scope: pregatire validare Physics Engine pe locuinte reale salvate in DB. Datele sunt anonimizate. Nu sunt incluse emailuri, nume, adrese exacte sau localitati.

Important: randurile similare cu profilul demo Salicea / 1964 au fost excluse din validarea de mai jos.

## Source query

S-a folosit o interogare read-only pe D1 remote pentru campuri tehnice din:

- `houses`
- `building_features`
- `envelope_profiles`
- `energy_profiles`

Campurile citite:

- type
- surface
- year
- floors
- ceiling height
- wall material
- wall thickness
- wall insulation
- windows
- heating
- monthly bill
- monthly kWh

## Validation readiness summary

| Case | Non-personal technical snapshot | Input completeness | Can validate Htr? | Can validate Hve? | Can validate QH,nd? | Can validate final energy? | Can validate primary/CO2/class? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Case A | 68 m2, year 2026, brick, 24 cm wall, 10 cm insulation | partial | partial with area fallbacks | no, missing volume/ACH | partial only with fallbacks | no, missing heating system | no, missing carrier/system |
| Case B | house, 120 m2, year 1930 | low | no, missing envelope | no | no | no | no |
| Case C | house, 100 m2, year 1940 | low | no, missing envelope | no | no | no | no |
| Case D | house, 80 m2, year 1955 | low | no, missing envelope | no | no | no | no |
| Case E | house, 90 m2, year 1975 | low | no, missing envelope | no | no | no | no |

## Case A details

Available:

- Useful/surface area: 68 m2
- Construction year: 2026
- Wall material: brick
- Wall thickness: 24 cm
- Wall insulation: 10 cm

Missing:

- building type
- number of floors
- ceiling height
- heated volume
- window type and area
- roof/attic/floor data
- ventilation ACH or airflow
- heating system
- DHW system
- energy carrier
- real consumption

Validation status:

- Geometry can be partially derived but would use fallback height/floors.
- Wall U can be estimated if material mapping and insulation material default are accepted.
- Full Htr cannot be validated because roof, floor, windows and door data are missing.
- Hve cannot be validated without volume/ACH unless fallback is accepted.
- Final/primary/CO2/class cannot be validated without heating system and carrier.

## Case B details

Available:

- Building type: house
- Surface: 120 m2
- Construction year: 1930

Missing:

- floors
- ceiling height
- full envelope
- windows
- heating
- ventilation
- DHW
- consumption

Validation status:

- Only area-based fallback run is possible.
- Not suitable for strict MC001-like validation.

## Case C details

Available:

- Building type: house
- Surface: 100 m2
- Construction year: 1940

Missing:

- floors
- ceiling height
- envelope
- windows
- heating
- ventilation
- DHW
- consumption

Validation status:

- Not enough data for Htr/Hve/QH,nd without fallback assumptions.

## Case D details

Available:

- Building type: house
- Surface: 80 m2
- Construction year: 1955

Missing:

- floors
- ceiling height
- envelope
- windows
- heating
- ventilation
- DHW
- consumption

Validation status:

- Not enough data for strict physics validation.

## Case E details

Available:

- Building type: house
- Surface: 90 m2
- Construction year: 1975

Missing:

- floors
- ceiling height
- envelope
- windows
- heating
- ventilation
- DHW
- consumption

Validation status:

- Not enough data for strict physics validation.

## Required inputs before strict real-home validation

Minimum fields needed for a meaningful real-home validation:

- heated area
- heated volume or ceiling height and floors
- envelope element areas or derivation inputs
- wall material and thickness
- wall insulation material/thickness
- roof/attic construction and insulation
- floor/ground/basement condition
- window type and approximate area
- door area/type or clear fallback rule
- ventilation type and ACH/airflow
- heating system type
- fuel/carrier
- seasonal efficiency or accepted registry source
- DHW source and occupants
- real consumption or bills, if calibration is required

## Conclusion

The current real saved homes are useful for testing missing-input behavior and fallback warnings. They are not sufficient for strict MC001-like numeric validation without adding many assumptions.

No full physics validation was run on Salicea/demo data in this document.

## Stage 1 source-of-truth parity check

Added on 2026-06-05. Rechecked with a read-only D1 query excluding 1964 / 64.8-65 m2 demo-like rows.

The same anonymized saved-home sample was used only for input-completeness and warning behavior. No personal fields were used.

| Case | Registry factor check | CO2 registry check | Class registry check | Expected warnings |
| --- | --- | --- | --- | --- |
| Case A | Cannot verify final carrier from DB because heating is missing | Cannot verify final carrier from DB because heating is missing | Building type is missing, so class needs building type | `MISSING_HEATING_OR_FUEL_INPUT`, `NEEDS_BUILDING_ENERGY_CLASS_TYPE` |
| Case B | Heating carrier missing; any computed carrier would be fallback-only | Heating carrier missing; any computed CO2 would be fallback-only | Building type exists, but class depends on fallback physics | `MISSING_HEATING_OR_FUEL_INPUT` |
| Case C | Heating carrier missing; any computed carrier would be fallback-only | Heating carrier missing; any computed CO2 would be fallback-only | Building type exists, but class depends on fallback physics | `MISSING_HEATING_OR_FUEL_INPUT` |
| Case D | Heating carrier missing; any computed carrier would be fallback-only | Heating carrier missing; any computed CO2 would be fallback-only | Building type exists, but class depends on fallback physics | `MISSING_HEATING_OR_FUEL_INPUT` |
| Case E | Heating carrier missing; any computed carrier would be fallback-only | Heating carrier missing; any computed CO2 would be fallback-only | Building type exists, but class depends on fallback physics | `MISSING_HEATING_OR_FUEL_INPUT` |

Parity status:

- The code path now uses `getPrimaryEnergyFactor` for primary energy factors.
- The code path now uses `getCo2Factor` for CO2 factors.
- The code path now uses `classifyEstimatedEnergyClass` for energy class thresholds.
- Missing/ambiguous carrier input is warning-worthy and should not be treated as validated real-home physics.
