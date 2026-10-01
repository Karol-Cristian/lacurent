# Energy Product Catalog V2

Status: isolated development branch
Branch: `codex/energy-product-catalog-v2`
Production runtime: unchanged

## Goal

Build one evidence-backed commercial catalog that can support:

- TEO planning curves;
- finalist product matching;
- bill-of-materials generation;
- product pages with source-backed technical data;
- supplier offers and observed prices;
- product images with an explicit rights/source basis;
- traceable technical documents and declared properties.

The existing `heating_products` tables remain canonical for the production heating runtime until an explicit migration is validated.

## Core rule

A product SKU must not become an optimizer search dimension merely because it exists in the catalog.

Products have one of four TEO roles:

1. `planning_curve`
   - Product observations derive a continuous technical/cost curve.
   - TEO searches the engineering variable, not every SKU.
   - Initial families: wall/roof/floor insulation, windows, PV, solar thermal.

2. `finalist_match`
   - TEO first solves the engineering requirement.
   - Real products are matched only to finalists.
   - Initial families: HRV, radiators, fan coils, pumps, buffers, heating generators.

3. `bill_of_materials`
   - Product is selected after the system geometry/design is known.
   - Initial families: underfloor pipe, manifolds, controls.

4. `informational`
   - Catalog/display only until an engineering mapping is defined.

This prevents catalog cardinality from multiplying the optimizer search space.

## Evidence model

Each product can have:

- manufacturer identity and exact model/SKU/GTIN;
- intended use;
- one or more source documents;
- parsed declared properties with exact document provenance;
- image references;
- multiple commercial offers;
- category-local technical-value/price metrics.

### Documents

The importer should prefer manufacturer or official regulatory sources.

Document types include:

- technical datasheet;
- declaration of performance, where applicable;
- energy label / product fiche, where applicable;
- Ecodesign product information, where applicable;
- installation manual;
- certificate or test report;
- environmental product declaration when useful.

Under the EU Construction Products Regulation, products covered by a harmonised standard or an ETA generally require a Declaration of Performance when placed on the market. The catalog therefore stores DoP evidence where applicable rather than assuming every product uses the same declaration regime.

### Images

Do not copy arbitrary retailer/manufacturer imagery into LACURENT assets.

Store:

- `image_url`;
- `source_url`;
- `rights_basis`;
- primary/secondary role;
- observation date.

Only cache/redistribute an image when the source terms or an agreement allow it.

## Technical value / price

There is deliberately no universal score across unrelated categories.

The metric is valid only inside a declared `comparison_scope`.

Examples:

| Category | Primary comparison numerator | Price basis | TEO use |
| --- | --- | --- | --- |
| Wall/roof/floor insulation | declared added R = thickness / lambda | lei/m² | derive R→CAPEX planning curve |
| Windows | 1/Uw | lei/m² | derive target-Uw→CAPEX curve |
| HRV | airflow × heat-recovery efficiency | lei/unit | preselection; TEO must still simulate heat recovery + fan electricity |
| Radiator | heat output at a common declared temperature condition | lei/unit | finalist emitter sizing |
| Underfloor pipe | usable package length | lei/package | bill of materials only |
| PV module | Wp | lei/module | derive kWp→CAPEX curve |
| Solar thermal collector | aperture area × optical efficiency | lei/unit | derive collector-area→CAPEX curve |
| Heat generator | rated kW | lei/unit | preselection only; efficiency/COP/performance map remains mandatory |

A high category-local value metric must never replace a full TEO recalculation.

## Technical declaration extraction

Do not flatten a datasheet to one field.

For every parsed property store:

- property key;
- numeric/text value;
- original unit;
- normalized value/unit;
- declared operating condition (`context_key`);
- source document id;
- exact page/table/section when available;
- confidence;
- whether TEO may consume it.

Examples of contextual values:

- heat-pump COP at A-7/W35;
- capacity at A-7/W35;
- radiator heat output at 75/65/20 or normalized ΔT;
- HRV thermal efficiency at declared airflow;
- fan power / SPI;
- window Uw and g;
- insulation lambda and thickness.

## Initial categories

### Envelope
- wall insulation
- roof insulation
- floor insulation
- windows

### Ventilation
- HRV units

### Heating generator
- heat pumps
- gas boilers
- electric boilers
- pellet boilers

### Heating emission/distribution
- radiators
- fan coils
- underfloor heating pipe
- manifolds
- circulation pumps
- buffers
- controls

### Renewables
- PV modules
- solar thermal collectors

Additional categories can be added only with an explicit technical requirement and mapping rule.

## Existing TEO compatibility

The current optimizer already supports:

- product-derived parametric cost curves for wall, roof and floor insulation;
- product-derived window curves;
- product-derived PV and solar-thermal system curves;
- D1-backed real heating products and heat-pump performance points.

Current gaps:

- ventilation uses a fixed system CAPEX allowance and needs real HRV discretization;
- radiator SKU selection is not yet dimensioned from design load / emitter temperatures;
- underfloor pipe/manifold selection is not yet generated from area, heat flux, spacing and loop constraints.

## Next integration sequence

1. Populate evidence-backed product records.
2. Build category importers with deterministic property normalization.
3. Derive planning curves from source-backed offers.
4. Connect HRV to TEO as a finalist match after required airflow/efficiency is known.
5. Add emitter sizing:
   - required heat output;
   - design flow/return temperatures;
   - radiator correction from declared condition.
6. Add underfloor bill-of-materials:
   - heated area;
   - design heat flux;
   - spacing;
   - maximum loop length;
   - pipe length;
   - manifold circuit count.
7. Verify that adding thousands of SKUs does not change TEO search cardinality.

## Acceptance rule

A commercial product can influence TEO only when:

- its technical source is present;
- the properties used by TEO are source-backed;
- price basis is explicit and timestamped;
- the product is compatible with the engineering requirement;
- TEO still performs the canonical physical/financial recalculation.
