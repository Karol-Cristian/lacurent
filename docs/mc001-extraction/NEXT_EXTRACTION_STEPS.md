# Next MC001 Extraction Steps

Rules:

- Do not extract further audit, cost measures, or recommendations unless explicitly requested.
- Do not implement formulas yet.
- Do not modify app behavior.
- Do not create calculators yet.
- Do not add tests.
- Do not touch production flow.
- Do not invent missing values.
- Every extracted formula must include inputs, output, unit, source reference, implementation notes, validation notes, and status.

## Extracted: `00_scope_terminology_symbols`

Scope:

- MC001 scope and terminology
- Physics Engine terms
- key symbols and indices

Expected output:

- terminology baseline for later modules
- clear separation between input, intermediate, output and classification concepts

## Extracted: `01_geometry_envelope_definitions`

Scope:

- envelope area
- useful/interior volume
- interior-surface geometry conventions
- missing-geometry behavior

Expected output:

- explicit area/volume formulas
- rule that useful area alone is not enough for envelope heat loss
- no square-footprint geometry assumptions

## Extracted: `02_materials_lambda_R_U`

Scope:

- lambda correction
- `R_layer`
- `R_total`
- `U`
- `R'` / `U'` corrected concept
- material condition coefficients

Expected output:

- formulas for material layer resistance and element transmittance
- required material registry fields
- warning rules for missing `lambda`, thickness, or surface resistances

## Extracted: `03_thermal_bridges`

Scope:

- `ψ`
- `χ`
- `Hd` with thermal bridges
- `U'` corrected
- thermal bridge length conventions

Expected output:

- distinction between linear and point thermal bridges
- conventions for length/point inclusion
- required thermal bridge registry fields

## Partial needs verification: `04_minimum_envelope_requirements`

Scope:

- minimum corrected thermal resistance `R'min`
- maximum corrected thermal transmittance `U'max`
- NZEB envelope requirements
- reference/renovation envelope tables
- validation rules for corrected envelope thresholds

Expected output:

- Tabel 2.4 and Tabel 2.7 values extracted
- Tabel 2.9a and Tabel 2.9b marked for visual verification
- Tabel 2.10a and Tabel 2.10b indexed for energy/CO2 performance context
- missing-table and plain-U-vs-corrected-U warning behavior

## Extracted: `05_transmission_heat_transfer`

Scope:

- `Hd`
- `Hg`
- `Hu`
- `Ha`
- `Htr`
- monthly transmission transfer

Expected output:

- calculation separation by boundary type
- direct exterior, ground, unconditioned, adjacent-space paths
- required correction factors and missing-value behavior

## Extracted: `06_ventilation_and_infiltration`

Scope:

- `Hve`
- `bve`
- airflow
- heat recovery
- unconditioned zones

Expected output:

- airflow inputs and units
- natural/mechanical ventilation split
- heat recovery handling
- missing ACH / airflow behavior

## Partial needs verification: `07_monthly_heating_cooling_demand`

Scope:

- monthly heat losses
- internal gains
- solar gains
- gain utilization
- `QH,nd`
- `QC,nd`

Expected output:

- monthly balance structure
- useful demand before systems
- clear separation from final energy

## Partial needs external data: `08_internal_and_solar_gains`

Scope:

- internal gains
- solar gains
- transparent solar gains
- opaque solar gains
- monthly gain data requirements

Expected output:

- formulas for `Qint`, `Qsol`, transparent solar gains, and opaque solar gains
- required inputs for occupancy/use, solar irradiation, orientation, tilt, glazing, shading, and absorptance
- missing-value behavior for monthly gains

## Blocked missing climate dataset: `17_climate_annex`

Scope:

- monthly exterior temperature
- annual exterior temperature
- monthly duration hours
- monthly solar irradiation
- orientation/tilt lookup
- sky radiation / longwave correction
- climate zone or locality mapping

Expected output:

- index of climate and solar data required by monthly MC001 method
- precise lookup keys for future climate registries
- missing-source behavior for monthly calculations

## Extracted: `09_dhw_systems`

Scope:

- useful DHW demand
- DHW volume / consumption
- cold and hot water temperatures
- DHW system losses
- DHW final energy

Expected output:

- useful DHW demand and residential volume formulas extracted
- Tabel 3.3.1 indexed for non-residential/default-by-use DHW values
- distribution/auxiliary relations (3.201)-(3.224) extracted
- separation between useful DHW demand and final DHW energy
- missing-value behavior for occupants, volume, temperatures, system type and losses

## Blocked missing lighting tables: `10_lighting`

Scope:

- lighting energy calculation
- installed lighting power
- operating hours / schedules
- daylight and control factors
- emergency and standby lighting energy
- LENI / specific lighting energy

Expected output:

- MC001 3.4 lighting scope and calculation sequence documented
- SR EN 15193-1 formula/table dependencies indexed
- reference-building lighting rule cross-referenced
- missing-value behavior for lighting data, installed power, and schedules
- no area-only lighting defaults

## Partial needs verification: `11_cooling_ventilation_systems`

Scope:

- cooling system energy
- mechanical ventilation and AHU system energy
- fan/pump auxiliary energy
- humidification and dehumidification energy
- reference cooling and ventilation assumptions

Expected output:

- MC001 Chapter 3 cooling/ventilation system rules indexed
- clear formulas for cooling generator input energy and cooling auxiliary aggregation extracted
- visually unclear AHU/fan/distribution formulas marked for verification
- reference cooling `SEER = 2.5` and reference ventilation heat recovery `75%` documented
- missing-value behavior for cooling demand, system performance, and fan/AHU data

## Partial needs verification: `12_renewables`

Scope:

- renewable-system scope
- solar thermal, photovoltaic, heat-pump, wind, and biomass treatment
- exported electricity and self-consumption rules
- renewable/non-renewable primary split
- RER / renewable contribution

Expected output:

- clear Chapter 5 electricity export and RER formulas extracted
- Chapter 4 renewable-system methods indexed with visual-verification warnings where formulas are not fully readable
- required renewable system data, climate/solar data, factor data, and missing-value behavior documented
- separation from energy class assignment

## Partial factor tables indexed: `13_final_primary_co2_rer`

Scope:

- final energy by carrier/service
- primary energy total / non-renewable / renewable
- CO2 emissions
- RER / renewable contribution
- factor table sources

Expected output:

- formulas for final energy service aggregation, primary energy, CO2, and RER
- indexed factor tables for primary energy and CO2 conversion
- missing-value behavior for carriers, factor tables, final energy, and reference area
- separation from energy class / CPE class assignment

## Partial needs verification: `14_reference_building`

Scope:

- reference building definition
- copied real-building geometry/location/orientation
- substituted reference envelope/system parameters
- reference calculation path
- missing reference table behavior

Expected output:

- textual MC001 rules for real vs reference building separation
- indexed reference parameter sources for envelope, systems, ventilation, lighting, renewables, climate, primary energy, and CO2
- clear blocking behavior when reference parameters or datasets are missing
- separation from energy class assignment in module `15_energy_classes_and_certificate`

## Partial needs verification: `15_energy_classes_and_certificate`

Scope:

- CPE / certificate indicator context
- energy classes by category and utility
- primary-energy and CO2 specific indicators
- class threshold tables
- certificate output indicator list

Expected output:

- MC001 rules for class table selection, interval boundaries, missing optional utilities, and mixed-use weighting
- indexed class tables `5.7` ... `5.14`
- indexed output indicators from `Tabel 5.15a`
- missing-threshold and missing-indicator behavior
- separation from useful-demand, final-energy, primary-energy, CO2, and reference-building calculators

## Partial needs verification: `16_audit_energy_measures`

Scope:

- audit workflow
- renovation measures/packages
- before/after energy savings
- CO2 savings
- global updated cost
- payback/economic indicators
- audit report data requirements

Expected output:

- audit workflow and before/after comparison rules extracted
- savings indicators documented as derived from MC001 audit comparison context
- exact economic formulas (6.1), (6.3), and (6.4) remain marked for visual verification before implementation after local PDF text extraction
- cost/price/lifetime inputs kept explicit or sourced, with no invented defaults

## Partial index only: `18_examples_and_breviars`

Scope:

- MC001 worked examples and breviars
- certificate output examples
- audit breviar examples
- validation candidate examples
- example input/output completeness status

Expected output:

- Anexa A certificate example indexed
- Anexa B audit breviar indexed
- Anexa 6.1 analysis sheet model indexed
- Anexa 6.2 and 6.3 renovation-measure catalogues indexed
- examples marked as manual validation only unless numerically complete and visually verified

## Registry complete with blockers: `19_extraction_registry`

Scope:

- final module status matrix
- consolidated formula registry
- table/data registry
- missing-input status registry
- consistency checks
- implementation priority

Expected output:

- all modules 00-18 indexed
- blockers preserved conservatively
- recommended next technical step focused on reviewed dataset registries
