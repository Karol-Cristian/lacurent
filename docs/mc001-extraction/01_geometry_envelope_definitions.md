# 01 Geometry And Envelope Definitions

Extraction status: `extracted`.

Source document:

- MC001-2022 - Metodologie de calcul al performantei energetice a cladirilor
- Local PDF: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

MC001 references:

- MC001-2022, 2.1.3, relatia (2.1)
- Chapter 1 / Section 1.1.7 for symbols and indices used by the formulas

## Purpose

This module extracts only the geometry and envelope definitions needed before material, R/U, thermal bridge, transmission, and ventilation calculations.

It does not define material conductivity, thermal resistance, U-value, thermal bridge formulas, climate data, or system calculations. Those belong to later extraction modules.

## Formulas

### Formula 1: thermal envelope area

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_1_ENVELOPE_AREA` |
| formulaText | `A = Σ Aj` |
| unit | `m2` |
| inputs | `Aj`: aria fiecarui element perimetral inclus in anvelopa termica, in `m2` |
| output | `A` |
| meaning | Aria anvelopei termice este suma ariilor elementelor perimetrale prin care are loc transfer termic. |
| MC001 reference | MC001-2022, 2.1.3, relatia (2.1) |
| implementation notes | `A` must be computed from explicit envelope element areas. For heat-loss calculations, include only perimeter elements through which heat transfer occurs. |
| validation notes | Each `Aj` must have explicit `type`, `areaM2`, `boundary condition`, source and confidence. Do not derive `Aj` from useful floor area alone. |

### Formula 2: useful/interior volume

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_1_USEFUL_VOLUME` |
| formulaText | `Vu = Σ Vj` |
| unit | `m3` |
| inputs | `Vj`: volumul fiecarui spatiu inclus in volumul climatizat, in `m3` |
| output | `Vu` |
| meaning | Volumul util/interior este suma volumelor spatiilor incluse in volumul climatizat. |
| MC001 reference | MC001-2022, 2.1.3, relatia (2.1) |
| implementation notes | `Vu` must be built from explicit zone volumes or from validated area-height data. The volume is delimited by internal surfaces of the thermal envelope. |
| validation notes | If `Vj` is missing, do not infer complex geometry. A simple area x height derivation is allowed only when both area and height are explicit and traceable. |

## Implementation Rules

| Rule | Implementation meaning | Status |
| --- | --- | --- |
| Envelope area is the sum of the areas of all perimeter elements through which heat transfer occurs. | `envelopeAreaM2` must be the sum of explicit envelope element areas, not a proxy from useful area. | extracted |
| Areas are determined using interior surfaces / total interior dimension convention. | Use internal-surface conventions consistently. Store `measurementConvention` on the model. | extracted |
| Interior elements such as internal walls and intermediate floors are ignored for envelope boundary area. | Do not include internal partitions unless they separate a conditioned zone from an unconditioned zone or another relevant thermal environment. | extracted |
| Interior total volume is delimited by the internal surfaces of the thermal envelope. | Ventilation volume should correspond to heated/cooled spaces inside the thermal envelope. | extracted |
| Useful/reference floor area is the useful area of heated/cooled spaces included in the thermal envelope. | `usefulAreaM2` and `heatedAreaM2` must be kept separate when they differ. | extracted |
| Do not derive envelope areas from square-footprint assumptions. | The engine should report missing envelope geometry instead of creating walls/roof/floor from a square plan. | extracted |
| Do not derive wall/roof/floor areas unless explicit geometry exists. | Derivations require explicit dimensions, measured areas, imported certificate data, or user-entered envelope element areas. | extracted |
| If geometry is missing, return missing input warnings rather than inventing geometry. | Calculation status should become partial/blocked for envelope heat loss when critical areas are absent. | extracted |

## Warnings

- `usefulAreaM2` is not enough to compute envelope heat loss.
- `heatedAreaM2` is not the same as envelope area.
- `heatedVolumeM3` is needed for ventilation and compactness calculations.
- A wall area, roof area, or floor area created from a square-footprint assumption is not acceptable for the MC001-like engine.
- Internal walls and intermediate floors should not be counted as external envelope boundary areas.
- Elements toward unheated spaces need explicit boundary type because later modules require correction factors.
- Missing geometry should produce `missing_input` warnings, not silent defaults.

## Implementation Implications For LaCurent

For Physics Engine v1:

- `usefulAreaM2` is not enough to calculate envelope heat loss.
- `heatedVolumeM3` is needed for ventilation and compactness calculations.
- envelope elements must eventually be explicit:
  - exterior walls
  - windows/doors
  - roof/top floor
  - floor/slab
  - ground-contact elements
  - elements toward unheated spaces
- each envelope element needs:
  - type
  - areaM2
  - boundary condition
  - layers or U-value
  - optional thermal bridges

## Envelope Boundary Elements

Envelope elements needed by LaCurent:

- exterior walls
- windows and exterior doors
- roof / top floor / ceiling under attic
- floor / slab
- ground-contact elements
- elements toward unheated spaces

Each element should include metadata:

- source type
- assumptions
- warnings
- confidence

## Not Extracted In This Module

The following are intentionally excluded and must be extracted separately:

- material conductivity `lambda`
- layer resistance `R`
- total resistance and surface resistances
- U-value and corrected U-value
- thermal bridges `ψ`, `χ`
- ground-contact correction formulas
- unconditioned-space correction factors
- transmission heat transfer coefficients
- ventilation heat transfer

