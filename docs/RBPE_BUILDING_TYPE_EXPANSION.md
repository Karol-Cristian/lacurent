# RBPE Building-Type Expansion

Status: design note
Production runtime: unchanged

## Current state

The commercial RBPE input already distinguishes:

- `residential_individual`;
- `residential_collective`.

The envelope model also supports boundaries to:

- outside air;
- ground;
- unheated spaces;
- adjacent heated spaces;
- adjacent unheated spaces.

This is enough to avoid designing apartment/multifamily support from zero.

## Recommended sequence

### 1. Whole apartment building

Use an aggregated single conditioned zone first.

Add UI inputs for:

- footprint / heated floor area;
- number of conditioned levels;
- facade dimensions and exposed orientations;
- glazing by facade;
- roof/top boundary;
- ground/basement boundary;
- common ventilation;
- common or apartment-level heating/DHW;
- common renewables.

Keep the canonical RBPE equations; change geometry and system assembly.

### 2. Individual apartment

Treat the apartment as the conditioned zone and model each boundary explicitly.

Required UI concepts:

- exterior facade area;
- party walls toward heated apartments;
- walls toward staircase/unheated corridors;
- floor over heated/unheated/outdoor space;
- ceiling under heated apartment/unheated attic/outdoor;
- apartment-level heating/DHW or allocated central system;
- ventilation/infiltration.

Do not infer exterior exposure from a detached-house geometry helper.

### 3. Industrial hall

Do not implement as a renamed residential building.

A hall needs a separate use-profile model for items such as:

- high ceiling / stratification;
- large door air exchange and intermittent infiltration;
- mechanical ventilation / heat recovery;
- air or radiant heating systems;
- occupancy and operating schedules;
- internal/process gains;
- process energy kept separate from building-services energy;
- possibly zones with materially different temperatures or schedules.

Residential energy classes and residential nZEB messaging must not be reused automatically.

## UI architecture

Start Home Lab with a building-mode choice:

- Casă
- Apartament
- Bloc / clădire rezidențială colectivă
- Hală / clădire industrială (later, professional mode)

Then route to a typology-specific geometry form while keeping common downstream pages for:

- envelope;
- systems;
- renewables;
- goal;
- plan.

This keeps one product identity while allowing different physics input assemblies.

## Test strategy

Each new typology needs:

- canonical input fixture;
- boundary-condition regression tests;
- energy-balance sanity tests;
- design-load tests;
- deterministic TEO test;
- UI payload contract test;
- explicit applicability tests for energy class / nZEB / regulatory labels.
