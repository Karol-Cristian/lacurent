# FIXTURE 011 - DHW Final Energy Displayed Subtotal

## Status

- Fixture id: `FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL`
- Source candidate: `MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS`
- Executable: yes, as a displayed arithmetic subtotal fixture only.
- Validated module: none.
- Scope exclusions: no DHW distribution-loss formula validation, no storage-loss validation, no generator-efficiency validation, no auxiliary-energy validation, no recovered-loss validation, no full DHW final-energy helper, no production integration, no UI, no workers, no DB/schema/API, no deploy, no push.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Anexa B page 525: DHW / ACC useful demand, distribution displayed subtotal, zero storage/generation/auxiliary rows, and final displayed `Qw,total`.
- `FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION`: reviewed source for `Qw,nd = 18519.13 kWh/an`.
- `INVESTIGATION_006_DHW_FINAL_ENERGY_CHAIN_MAP`: reviewed policy that page 525 supports only display-subtotal reconciliation, not physical system-loss validation.

## Displayed Inputs

| Row | Source value | Fixture role |
| --- | ---: | --- |
| `Qw,nd` | `18519.13 kWh` | Fixture 010 validated useful-demand row reused as displayed input. |
| `Qw,dis,tot` | `19599.3 kWh` | Displayed distribution subtotal input only. |
| `Qw,sto` | `0 kWh` | Displayed zero storage row only. |
| `Qw,g` | `0 kWh` | Displayed zero generation row only. |
| `Ww` | `0 kWh` | Displayed zero auxiliary row only. |
| `Qw,total` | `38118 kWh` | Displayed final DHW total used for display-delta comparison. |

## Validated Arithmetic

The fixture validates only:

```text
Qw,total = Qw,nd + Qw,dis,tot + Qw,sto + Qw,g + Ww
```

Using the displayed page 525 values:

```text
18519.13 + 19599.3 + 0 + 0 + 0 = 38118.43 kWh
```

Comparison to the displayed total:

| Metric | Expected/displayed | Calculated | Absolute delta | Percentage error |
| --- | ---: | ---: | ---: | ---: |
| Component subtotal | `38118.43 kWh` | `38118.43 kWh` | `0 kWh` | `0%` |
| Displayed `Qw,total` | `38118 kWh` | `38118.43 kWh` | `0.43 kWh` | `0.001128%` |

The `0.43 kWh` difference is a display/rounding delta. The test tolerance for the displayed total is `0.5 kWh`.

## Assumptions

- `Qw,nd = 18519.13 kWh/an` is reused from the validated page 525 useful-demand chain and is not recalculated with a fitted water constant.
- `Qw,dis,tot = 19599.3 kWh` is accepted only as a displayed subtotal input.
- Zero rows for storage, generation and auxiliary energy are accepted only as displayed subtotal inputs.
- No underlying system-loss term is derived from physical inputs in this fixture.

## Blocked Rows

| Row | Reason |
| --- | --- |
| Annual distribution-loss formula | `Qw,dis,tot` is displayed but not independently traceable from pipe/system inputs. `INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS` still blocks annual distribution-loss validation. |
| Storage-loss formula | Page 525 displays `Qw,sto = 0`, but relation (3.228) inputs are not provided. |
| Generation-loss formula | Page 525 displays `Qw,g = 0`, but section 3.3.9 delegates generator calculation to section 3.1.5 / SR EN 15316-4-1. |
| Auxiliary-energy formula | Page 525 displays `Ww = 0`, but nonzero pump/control inputs are not provided. |
| Recovered losses | Page 525 does not provide a traceable recovered-loss treatment into `Qw,total`. |
| Full DHW final-energy calculation | This fixture validates only displayed subtotal arithmetic. It must not be used as a full DHW final-energy helper validation. |

## Verification Notes

- No `dhwSystemLosses.mjs` or full final-energy helper is created.
- No existing Physics Engine formulas are modified.
- Fixture 011 is allowed to overlap Fixture 008 only as source context: Fixture 008 already validates the page 525 `38118 kWh` final-energy row through Tabel 5.17 primary-energy conversion. Fixture 011 validates only the preceding page 525 displayed DHW subtotal arithmetic.
