# Home Lab / Optimizer V2 calculation audit — 2026-09-26

## Scope

Audit of the production calculation path:

1. Home Lab building physics.
2. Worker-safe optimizer V2.
3. Heating-technology branches.
4. Heat-pump COP/capacity treatment.
5. D1 heating catalog.
6. Commercialization and economic identities.
7. HTTP 500/503 failure surface.

## Non-negotiable invariants

- Annual saving = baseline annual bill - final annual bill.
- If CAPEX > 0 and annual saving > 0, simple payback = CAPEX / annual saving.
- A result must not be reported as economically complete if these identities fail.
- Design heating load is recalculated after every accepted physical intervention.
- Heat-pump product sufficiency is checked against available capacity at the design condition when a source-backed curve covers that point.
- COP/capacity must not be extrapolated outside the published manufacturer domain.
- A dense parametric optimizer grid is not a commercial SKU catalog.

## Heating design load

The canonical Light Engine design-load path includes:

- exterior transmission Hd/Hu/Ha;
- ground transmission Hg on the separate ground-temperature path;
- thermal bridges through the transmission coefficients;
- controlled ventilation;
- explicit uncontrolled infiltration;
- locality winter design temperature;
- no credit for solar/internal gains at the design point.

Known limitations remain explicit:

- not a room-by-room EN 12831 implementation;
- intermittent reheating is not modeled;
- DHW storage/reheat power remains separate from the space-heating design load;
- ground-source heat-pump source-side capacity needs source-temperature/brine data not present in the current product schema.

## Optimizer V2

Worker-safe V2 remains staged:

1. representative physical search;
2. shared shortlist;
3. one request per economic heating branch;
4. canonical verification of a bounded number of finalists;
5. real product matching only after raw mathematical selection.

This separation is intentional: selecting/recalculating real SKUs for every raw candidate was a major CPU-risk pattern.

## D1 catalog architecture

The catalog now has two different layers.

### Commercial products

Real products remain source-backed market observations. They retain product identity, price source, rated output, performance provenance and confidence.

### Parametric heating nodes

A separate `heating_parametric_nodes` table contains exactly 1000 mathematical interpolation nodes derived from the source-backed commercial anchors.

These nodes:

- are not SKUs;
- are never shown as real products;
- do not invent COP or capacity curves;
- densify the kW -> planning-CAPEX relationship used during raw optimization;
- defer final discretization to the commercial-product stage.

D1 synchronization uses bounded `DB.batch()` operations rather than one remote round trip per row.

## Heat-pump performance

Priority order for seasonal performance:

1. modeled SCOP from source-backed COP curve, only when >= 90% of the modeled heating-energy profile is covered without extrapolation;
2. source-backed seasonal SCOP (EN 14825 / manufacturer seasonal data) nearest the configured application/flow temperature;
3. LaCurent Light fallback only when the catalog does not provide sufficient source-backed seasonal information.

At the winter design point:

- capacity is accepted as verified only inside the published capacity domain;
- nominal catalog power is not treated as proof of available capacity at -12/-15/-18/-21/-24 C;
- unsupported design points are reported as unverified rather than extrapolated.

Current catalog coverage remains uneven. Several air-water products publish only A7/A2/-7 operating points, so exact capacity at colder Romanian design temperatures remains unavailable for those SKUs.

## Economic result

Every finalized V2 payload now exposes:

- baseline annual bill;
- final annual bill;
- annual saving;
- CAPEX;
- economic status;
- simple payback when mathematically defined;
- simple cumulative net benefit at 5/10/15/20/25 years.

Current lifecycle metric deliberately excludes financing, discount rate, maintenance, replacements, residual value and energy-price escalation until those inputs are explicitly modeled/source-backed.

A missing payback is no longer presented ambiguously:

- positive CAPEX + non-positive saving -> does not amortize;
- positive saving + zero CAPEX -> no-CAPEX saving;
- no intervention -> no investment.

## 500/503 stability hardening

Identified risk surfaces:

- CPU spikes in finalist verification/commercialization;
- repeated branch work;
- D1 catalog synchronization using one statement round trip per row;
- transient Worker/network failures surfaced directly to the UI.

Changes:

- V2 remains sharded by heating branch;
- completed branch results are retained client-side during the run;
- transient HTTP 500/502/503/504 requests are retried up to three times at the current stage only;
- D1 writes are batched;
- the production gate validates optimizer economic identities and D1 parametric-node count.

Retries are a resilience layer, not a substitute for fixing deterministic calculation failures.

## Remaining high-priority work

1. Expand source-backed air-water capacity/COP tables toward Romanian design temperatures, model by model.
2. Add explicit source-side curves for ground-source heat pumps.
3. Add DHW storage volume / recovery-time sizing.
4. Add optional n50 -> infiltration conversion with exposure/shielding assumptions.
5. Add lifecycle economics only after defining transparent maintenance, replacement, discount and energy-price scenarios.
6. Continue comparison campaign against an independent detailed building-energy model before claiming engineering-equivalent certification accuracy.
