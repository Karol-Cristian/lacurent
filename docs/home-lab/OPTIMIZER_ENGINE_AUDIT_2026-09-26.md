# Home Lab calculation & optimizer audit — 2026-09-26

## Scope

End-to-end path reviewed:

UI -> canonical Light Engine -> V2 worker-safe optimizer -> heating branch -> commercial product match -> report -> D1 catalog.

The objective is numerical correctness first, then scale. A larger catalog must not hide weak physics, incomplete economics, or Worker instability.

## Current production facts

- Canonical Light Engine is used for the baseline and final verification.
- V2 worker-safe search is staged into plan, branch and finalize requests.
- Representative search is bounded: seven continuous dimensions are probed at 0/50/100% and combined through a marginal ladder.
- Worker shortlist is capped at 6 configurations.
- Final canonical verification is capped at 3 finalists.
- Heating catalog baseline: 40 products.
- Heat-pump performance baseline: 50 operating points.
- Seasonal heat-pump baseline: 2 seasonal records.
- Production runtime catalog comes from Cloudflare D1 with a repository seed fallback.

## Findings

### 1. HTTP 500 / 503

Primary risks found:

1. Heating D1 catalog synchronization was performed from request handling. A future 1000-product seed would imply hundreds/thousands of D1 writes during an optimizer request and materially increase CPU/time failure risk.
2. Editorial plan/branch/finalize requests had no transient retry. A single Worker/D1 500/502/503/504 terminated the whole run.
3. The global exception handler logged only the exception type, making unhandled 500 diagnosis weak.
4. The old monolithic optimizer remains in the codebase; the Editorial UI uses staged V2, which is the correct production path.
5. Finalize still performs canonical finalist verification plus commercial matching, so it remains the highest-risk V2 stage.

Actions in this change:
- D1 heating catalog becomes persistent/read-mostly. Repo seed bootstraps only an empty database.
- Runtime no longer deactivates/re-writes products because a repo seed version changed.
- UI retries only transient server/network faults with bounded backoff.
- Each optimizer run gets a stable run ID and catalog/evaluation diagnostics.
- Global unhandled errors include request path and bounded exception detail in Worker logs.

### 2. Economic result sometimes has no savings/payback

Current mathematics:
- annual saving = baseline annual bill - candidate annual bill.
- simple payback = CAPEX / annual saving only when CAPEX > 0 and annual saving > 0.
- ROI/year = annual saving / CAPEX when CAPEX > 0.

Therefore a missing payback can mean materially different things:
- no investment selected,
- no positive annual saving,
- negative annual saving,
- incomplete result.

These states were previously collapsed into null / "—".

Actions in this change:
- explicit economicStatus and paybackStatus;
- baseline bill, final bill and annual saving always exposed;
- simple net benefit shown at 5/10/15/20/25 years;
- report explains no-positive-intervention and non-positive-saving cases.

Remaining lifecycle work:
- real discount rate / financing;
- energy-price escalation scenarios;
- maintenance;
- component replacement;
- residual value;
- grants/subsidies;
- uncertainty bands.

These must be explicit inputs or source-backed assumptions, not hidden constants.

### 3. Optimizer search is intentionally bounded, not exhaustive

Current V2 is more sophisticated than "24 random evaluations", but it is still a bounded heuristic:
- isolated axis probes;
- two marginal segments per dimension;
- combined marginal ladder;
- Pareto shortlist;
- branch evaluation;
- <=3 canonical finalists.

Strength:
- fast enough for Worker runtime;
- complete building recalculation after accepted combined interventions;
- deterministic/reproducible.

Risk:
- second-order interactions can be missed when an intervention is weak in isolation but strong in combination;
- fixed 0/50/100% probes do not characterize strongly nonlinear cost/physics curves;
- one shortlist learned before heating-branch evaluation can miss branch-specific interactions.

Recommended V3 search:
- keep deterministic axis probes;
- add low-discrepancy interaction samples (Sobol/Halton) as separate CPU-bounded work units;
- preserve branch sharding;
- adaptive refinement only around Pareto neighborhoods;
- canonical verification budget decided by convergence, not a hard-coded "3" alone;
- publish convergence diagnostics in the report.

Do not return to one monolithic request.

### 4. Heating design load

Already hardened before this audit:
- envelope transmission;
- thermal bridges;
- ground path separated from outdoor extreme;
- controlled ventilation;
- explicit additional infiltration;
- locality winter design temperature;
- no arbitrary universal oversizing factor;
- heat-pump product capacity distinguished from catalog nominal output.

Remaining:
- n50 / airtightness conversion model;
- exposure/wind/stack-sensitive infiltration;
- room-by-room design load;
- intermittent setback recovery;
- DHW storage/reheat sizing;
- ground-source source-side design condition.

### 5. Heat pump performance

The production data model already supports:
- outdoor temperature;
- flow temperature;
- return temperature;
- heating capacity;
- COP;
- test standard;
- seasonal SCOP;
- climate;
- application temperature;
- design load.

This is the correct basis for air-water product sizing.

Required quality rule:
A product must not be called "verified at design point" unless source-backed capacity covers the building design outdoor temperature and required flow temperature without unsupported extrapolation.

For air-air:
- capacity and COP must be tied to outdoor temperature;
- multisplit combinations must be represented as combinations, not treated as a single indoor unit nominal rating.

For ground-source:
- outdoor air temperature is not the independent source-side variable;
- source entering/leaving brine/water conditions are required in a future schema.

### 6. D1 catalog scaling

Old behavior:
- repo seed was effectively the authoritative runtime version;
- request handling synchronized seed -> D1;
- rows with another catalog version could be deactivated/deleted.

This is unsafe for a 1000+ product catalog.

New behavior:
- D1 is persistent runtime source;
- repo seed bootstraps only a genuinely empty catalog;
- all active D1 product versions can coexist;
- active product performance points are read through product joins;
- deploy smoke tests enforce minimum verified baseline counts rather than exactly 40.

Next catalog schema refactor should separate:

#### Certified physics identity
- manufacturer
- model
- certification body
- certificate/registration ID
- heat-pump type
- refrigerant
- source URL
- certification/observation date

#### Operating points
- source/outdoor temperature
- sink/flow temperature
- return temperature
- capacity
- COP
- part-load condition
- test standard

#### Seasonal data
- climate
- application temperature
- Pdesignh
- SCOP
- TOL
- Tbiv

#### Commercial offer
- retailer/supplier
- SKU
- price
- currency
- VAT treatment
- stock
- observed date
- installation allowance / installation package

The physics record and the retail offer must not be the same source of truth.

## Path to 1000+ products

Do not generate 1000 fake commercial SKUs.

Preferred source-backed ingestion order:

1. Heat Pump KEYMARK API for certified heat-pump model identities and technical data.
2. Eurovent certified directory / CSV for certified performance cross-check and additional product families.
3. EPREL Public API where useful; it requires an API key.
4. Retail feeds only for current price/availability, mapped onto certified model identity.

Import quality tiers:

- A: certified model + operating-point capacity/COP + seasonal data + retail match.
- B: certified model + seasonal data + incomplete operating-point map.
- C: commercial model/rated output only; may be shown as provisional but not claimed sufficient at extreme design condition.

Production optimizer should prefer A, then B where design capacity is verifiable, and never silently elevate C to verified.

## Acceptance criteria before calling the optimizer "engineering robust"

1. Same candidate gives numerically equivalent fast-engine and canonical metrics within documented tolerances.
2. Every economic finalist has an explicit economic status.
3. Every heat-pump finalist has a design-capacity verification status.
4. Every non-null payback is reproducible from reported CAPEX and annual saving.
5. 500/503 retries preserve one run ID and do not duplicate state-changing work.
6. D1 catalog size can exceed 1000 without runtime seed writes.
7. Product physics provenance is independent from retail price provenance.
8. Search convergence/coverage is visible in the report.
9. Regression matrix covers climate zones I-V, old/new envelopes, low/high infiltration, emitters at 35/45/55+ C and all heating technologies.
10. No result is labeled "commercially verified" when required source-backed operating data is missing.
