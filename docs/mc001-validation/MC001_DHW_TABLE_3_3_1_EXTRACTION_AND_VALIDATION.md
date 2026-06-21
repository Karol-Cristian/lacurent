# MC001 DHW Table 3.3.1 Extraction And Validation

## Status

- Task id: `MC001_DHW_TABLE_3_3_1_EXTRACTION_AND_VALIDATION`
- Source candidate affected: `MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS`
- Result: Tabel 3.3.1 is readable and now has a reviewed numeric dataset registry.
- Scope: dataset extraction and validation only.
- At the time of this dataset task, no DHW formula helper, product flow, UI, worker, DB/schema/API, orchestrator, deploy, push, certificate, class, or RER work was added.
- Subsequent task `MC001_DHW_USEFUL_DEMAND_FORMULA_EXTRACTION` added isolated helper coverage for relations (3.188)-(3.196) only.

## Source Pages Inspected

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- PDF page 253: relation (3.190) and the statement that non-residential DHW demand uses Tabel 3.3.1 values.
- PDF page 254: relation (3.191), temperature correction context, and the note that Tabel 3.3.1 values are stated for `60 degC` and cold water `10 degC`.
- PDF page 256: Tabel 3.3.1 rows 1-12.
- PDF page 257: Tabel 3.3.1 rows 13-18.
- `docs/mc001-extraction/09_dhw_systems.md`: existing DHW formula extraction and dataset status.
- `src/physics-engine/datasets/mc001DhwDemandTable3_3_1.mjs`: existing metadata-only registry, now replaced with reviewed numeric rows.

## Extraction Result

Tabel 3.3.1 is executable as a dataset registry.

Numeric rows extracted:

```text
49 numeric subrows
unit: l/unitate,zi la 60 degC
source pages: 256-257
```

Blocked/non-numeric table rows:

| Source row | Destination | Reason |
| --- | --- | --- |
| 1 | Locuinte unifamiliale/insiruite | Source says to calculate according to chapter 3.3.6.1; no numeric table value is provided. |
| 2 | Apartamente | Source says to calculate according to chapter 3.3.6.1; no numeric table value is provided. |

## Dataset Rows Added

The dataset now includes numeric entries for:

- Birouri.
- Cluburi, case de cultura si teatre.
- Spatii comerciale, centre comerciale, magazine.
- Cantine, restaurante, bufete.
- Cladiri pentru cazare elevi, studenti, persoane in varsta.
- Cladiri pentru copii.
- Hoteluri si pensiuni.
- Dispensare, policlinici.
- Cladire sanatate.
- Sanatorii, centre recuperare.
- Scoli.
- Cladire de sport pentru elevi.
- Grupuri sanitare pentru terenuri de sport, stadioane.
- Cladiri pentru transport.
- Spalatorii.
- Cladiri industriale.

## Validation Added

Dataset tests validate:

- entry count: `49`;
- source pages: `256-257`;
- metadata status: `reviewed_numeric_values_extracted`;
- unit: `l/unitate,zi la 60 degC`;
- selected key lookups, including offices, hotels, and stadium spectators;
- exact numeric values for all 49 extracted entries;
- blocked residential formula-reference rows 1-2;
- frozen dataset/list behavior.

## Remaining DHW Gaps

- Isolated `src/physics-engine` useful-demand helper coverage now exists for relations (3.188)-(3.196).
- The table gives specific demand values, but executable Anexa B DHW demand still needs explicit building destination, service unit count `f`, temperature choices, and period volume/schedule.
- Anexa B DHW service inputs are not yet cleaned into an executable fixture.
- DHW final energy remains separate from useful DHW demand and still needs traced distribution, storage, generation, and system inputs.
- Lighting external-standard data still blocks the broader `MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS` example.

## Recommended Next Target

Next safest validation target: a cleaned Anexa B DHW service-unit fixture only if the source provides explicit unit counts and period/schedule data that can be combined with the reviewed Tabel 3.3.1 dataset and the isolated useful-demand helper.
