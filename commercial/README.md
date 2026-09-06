# LaCurent Commercial v2

LaCurent Commercial v2 is a small standalone residential building-energy
calculator. It is deliberately independent from the historical product
architecture in the rest of the repository.

## Run

```bash
cd commercial
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then open `http://127.0.0.1:8000`.

## Test

```bash
python -m pytest commercial/tests
```

## Calculation Scope

The app calculates:

- transmission heat transfer: `Htr = sum(U * A) + sum(psi * L)`;
- ventilation heat transfer: `Hve = 0.34 * ACH * heated volume * recovery factor`;
- monthly heating and cooling useful demand using monthly exterior
  temperatures, heat loss, internal gains and optional explicit solar gains;
- heating final energy for boilers, electric resistance, district heat,
  heat pumps and configurable systems;
- cooling final energy with SEER;
- domestic hot water from occupants, litres per person per day and system
  efficiency;
- final energy by service and carrier;
- primary energy and CO2 emissions from methodology factors;
- a reference building calculated by the same engine from the same geometry;
- residential performance class from explicit methodology thresholds.

## Methodology Data

The following values were copied into `commercial/data/methodology.json` from
validated data already present in the repository:

- carrier primary-energy factors and CO2 factors from
  `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs`;
- residential energy-class thresholds from
  `src/physics-engine/datasets/mc001EnergyClassThresholds.mjs`;
- residential internal-gain values from the existing MC001 Table 2.15 data;
- selected MC001/6-2013 monthly exterior temperature rows from
  `src/climate-platform/datasets/mc001_6_2013ClimateDataset.mjs`.

The commercial DHW model uses explicit methodology values: 50 L/person/day at
60 C and 0.05814 kWh/L for a 10 C to 60 C water temperature rise.

## Limitations

This is a commercial performance report, not a legally issued Romanian CPE.
The v2 app intentionally does not implement detailed material assemblies,
automatic solar preprocessing, official CPE layout/mapping, accounts,
persistence, renovation scenarios, authentication or cloud deployment logic.
