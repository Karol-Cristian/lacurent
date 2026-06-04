# LaCurent AI Assistance Layer

AI Assistance Layer helps LaCurent interpret incomplete or messy user input, ask better follow-up questions, propose scenarios worth simulating, and explain report findings in simple language.

It is not the source of final numeric truth.

## Rules

- AI may suggest.
- AI may normalize.
- AI may explain.
- AI may classify.
- AI may generate assumptions.
- AI must not produce final energy scores, official classes, ROI, costs, emissions, or certificate-like numeric results.

## Correct Flow

User input
-> AI normalization and missing-data detection
-> Physics Engine calculation
-> AI explanation of validated results

## Numeric Truth

Final numeric values must come from:

- user-provided data;
- configured registries;
- LaCurent Physics Engine;
- validated calculations.

AI outputs include explicit policies such as `physics_engine_is_source_of_truth` and `no_final_numbers_from_ai` so future integrations do not accidentally treat explanations as calculations.

## Validation

AI output must pass guardrail validation before it is rendered or persisted.

Required validation checks:

- output envelope contains `status`, `confidence`, `assumptions`, `missingData`, `warnings` and `result`;
- every AI numeric estimate contains `sourceType`, `unit`, `confidence`, `assumptions` and `validationNeeded`;
- AI estimates cannot overwrite deterministic Physics Engine results;
- recommendations include reason, verdict, risk/context fields and missing data;
- negative recommendations are first-class outputs, not errors.
