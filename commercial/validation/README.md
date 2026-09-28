# Commercial Golden Reference Suite

This gate exists to detect material drift in the production LaCurent Light calculation chain before merge.

## Independence

The oracle is implemented in `commercial/validation/golden_reference.py`. It intentionally does not import `commercial.app.engine`, `commercial.app.models`, or production calculation helpers. It reads the committed golden-case matrix plus the Romanian monthly climate input dataset.

The suite is an independent implementation for a controlled Light Engine subset. It is not an auditor signature and it is not a claim of complete MC001 certificate-engine validation.

## Coverage

The matrix contains exactly 20 named cases (`GR-001` ... `GR-020`) covering:

- 5 Romanian MC001 climate stations: Miercurea Ciuc, Cluj-Napoca, Iași, București, Constanța;
- both supported residential building types;
- old and renovated envelope profiles;
- condensing gas, heat pump, direct electric and district heating;
- active cooling;
- gas, electric/heat-pump and district-heating DHW variants;
- explicit ground and adjacent-heated boundary examples.

For every case the oracle independently recomputes:

- annual useful heating demand QH,nd;
- annual useful cooling demand QC,nd;
- final energy by carrier for the controlled system subset;
- total and specific primary energy;
- total and specific CO2;
- residential energy class.

## Source-locked constants

The validation oracle locks the following values and requires an explicit reviewed change when they move:

- monthly-method effective internal heat capacity: 165,000 J/(m²K), medium class;
- aH0 = aC0 = 1 and tauH0 = tauC0 = 15 h;
- ventilation coefficient 0.34 Wh/(m³K);
- primary-energy factors: gas 1.17, electricity 2.50, district heat 0.92, biomass 1.08;
- CO2 factors: gas 0.202, electricity 0.107, district heat 0.220, biomass 0.039 kg/kWh final;
- residential class thresholds from the source-traced MC001 Tables 5.7 and 5.8;
- DHW useful-energy conversion 0.05814 kWh/litre from 10°C to 60°C.

The Romanian monthly outdoor-temperature profiles come from `commercial/data/climate.json`, which is treated as shared source input rather than shared calculation code.

## Tolerances

Tolerances are versioned in `golden_reference_cases.json` and enforced fail-closed:

| Metric | Absolute | Relative |
| --- | ---: | ---: |
| QH,nd annual | 0.1 kWh | 0.005% |
| QC,nd annual | 0.1 kWh | 0.005% |
| Primary energy total | 0.5 kWh | 0.01% |
| Primary energy specific | 0.05 kWh/(m²·an) | 0.05% |
| CO2 total | 0.2 kg | 0.02% |
| CO2 specific | 0.02 kg/(m²·an) | 0.1% |
| Energy class | exact | exact |

The allowed numerical error is the larger of absolute and relative tolerance. Energy class must match exactly.

## CI gate

`commercial/tests/test_golden_reference_suite.py` is part of the Commercial PR pytest suite. Any tolerance breach, missing matrix coverage, duplicated case id, loss of cooling coverage, or production-code import into the oracle fails CI.

## Deliberate exclusions

This matrix does not silently extend beyond its evidence. It does not validate detailed Chapter 3 generator-loss allocation, detailed DHW distribution/storage losses, PV/solar-thermal balance, dynamic transparent-element procedures, or every advanced ground/unheated-zone branch. Those remain separate validation tracks.
