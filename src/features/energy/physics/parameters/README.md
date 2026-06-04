# Physics Parameters

This folder is the canonical parameter database for the LaCurent Physics Engine.

Use it before adding new MC001-inspired formulas.

## Files

* `physics-parameters.json` defines physical quantities used or planned by the engine.
* `physics-indices.json` defines MC001-style indices/subscripts and their meaning inside LaCurent.
* `mc001-symbols.official.json` stores the official MC001 symbol vocabulary.
* `mc001-indices.official.json` stores the official MC001 index/subscript vocabulary.
* `mc001-notation.official.json` stores exact MC001-style mathematical notation for LaCurent parameters.
* `lacurent-mc001-parameter-links.json` maps LaCurent parameters to official MC001 symbols/indices.

## Rules

1. Add a parameter before adding a stable formula that uses it.
2. Keep MC001 symbols in metadata and documentation.
3. Use descriptive internal field names in code.
4. Do not use ambiguous symbols like `H`, `Q`, `E`, `i`, `j` as persistent model field names.
5. Separate useful demand (`nd`) from final energy (`fin`).
6. Every physics result should carry `value`, `unit`, `source`, `confidence` and `assumptions`.
7. Mark placeholders as `internal_estimate`; do not describe them as official MC001 values.
8. Do not add a stable LaCurent parameter without linking it to official MC001 vocabulary or marking why no MC001 equivalent exists.
9. Technical documentation should display `mc001-notation.official.json` notation, not only internal code names.

## Generate Docs

Run:

```bash
npm run docs:physics-params
```

This generates:

```text
docs/PHYSICS_PARAMETER_DATABASE.md
```
