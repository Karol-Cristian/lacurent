# P7A Executed Formula Trace

Chapter 2 heating and cooling monthly demand case results now include `executionTrace`.

## Arithmetic Trace

Arithmetic branches include:

- `formulaId`
- `branchId`
- numeric inputs with units
- structured expression
- `rawResult`
- `finalResult`
- unit
- clamp flag

The reusable evaluator in `src/physics-engine/mc001ExecutionTrace.mjs` independently evaluates the structured expression and compares it with `rawResult`.

## Branch Trace

Branch results include:

- `branchId`
- condition expression
- `condition.evaluated: true`
- `finalResult`
- reason

The report renders branch traces as branch results and does not display a generic unevaluated balance as executed arithmetic.

Example:

```text
Ramura executata: inverse_gammaC_greater_than_two_zero_demand
Conditie evaluata: (1 / gammaC) > 2 => true
QCnd_ianuarie := 0,0000 kWh
Formula generala de bilant nu a fost evaluata in aceasta ramura.
```
