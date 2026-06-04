import type { AiCalculationEstimate, AiTraceableNumber } from "../schemas/AiCalculationEstimate";
import type { AiOutputEnvelope } from "../schemas/AiOutputEnvelope";
import type { AiRecommendation } from "../schemas/AiRecommendation";

export interface AiValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function result(errors: string[], warnings: string[] = []): AiValidationResult {
  return { valid: errors.length === 0, errors, warnings };
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAssumptions(value: { assumptions?: unknown }): boolean {
  return Array.isArray(value.assumptions) && value.assumptions.length > 0;
}

export function validateAiOutputEnvelope<T>(output: Partial<AiOutputEnvelope<T>>): AiValidationResult {
  const errors: string[] = [];
  const statuses = ["ok", "needs_more_data", "cannot_determine"];
  const confidences = ["low", "medium", "high"];

  if (!statuses.includes(String(output.status))) errors.push("AI output status is missing or invalid.");
  if (!confidences.includes(String(output.confidence))) errors.push("AI output confidence is missing or invalid.");
  if (!Array.isArray(output.assumptions)) errors.push("AI output assumptions must be an array.");
  if (!Array.isArray(output.missingData)) errors.push("AI output missingData must be an array.");
  if (!Array.isArray(output.warnings)) errors.push("AI output warnings must be an array.");
  if (!("result" in output)) errors.push("AI output result is missing.");

  return result(errors);
}

export function validateTraceableNumber(value: Partial<AiTraceableNumber>, fieldName = "number"): AiValidationResult {
  const errors: string[] = [];
  const sourceTypes = ["user_provided", "registry_default", "deterministic_calculation", "ai_estimate", "placeholder_unknown"];
  const confidences = ["low", "medium", "high"];

  if (!hasText(value.unit)) errors.push(`${fieldName} unit is required.`);
  if (!sourceTypes.includes(String(value.sourceType))) errors.push(`${fieldName} sourceType is missing or invalid.`);
  if (!confidences.includes(String(value.confidence))) errors.push(`${fieldName} confidence is missing or invalid.`);
  if (!Array.isArray(value.assumptions)) errors.push(`${fieldName} assumptions must be an array.`);
  if (typeof value.validationNeeded !== "boolean") errors.push(`${fieldName} validationNeeded must be boolean.`);

  if (value.sourceType === "ai_estimate") {
    const hasRange = Array.isArray(value.valueRange) && value.valueRange.length === 2;
    if (!hasRange && typeof value.value !== "number") errors.push(`${fieldName} AI estimate must include value or valueRange.`);
    if (!hasAssumptions(value)) errors.push(`${fieldName} AI estimate must include assumptions.`);
  }

  return result(errors);
}

export function validateAiCalculationEstimate(estimate: Partial<AiCalculationEstimate>): AiValidationResult {
  const errors: string[] = [];
  const confidences = ["low", "medium", "high"];

  if (!hasText(estimate.metric)) errors.push("AI calculation metric is required.");
  if (estimate.sourceType !== "ai_estimate") errors.push("AI calculation sourceType must be ai_estimate.");
  if (!hasText(estimate.formula)) errors.push("AI calculation formula is required.");
  if (!hasText(estimate.unit)) errors.push("AI calculation unit is required.");
  if (!confidences.includes(String(estimate.confidence))) errors.push("AI calculation confidence is missing or invalid.");
  if (!hasAssumptions(estimate)) errors.push("AI calculation assumptions are required.");
  if (typeof estimate.validationNeeded !== "boolean") errors.push("AI calculation validationNeeded must be boolean.");
  if (!Array.isArray(estimate.warnings)) errors.push("AI calculation warnings must be an array.");
  if (typeof estimate.result !== "number" && !Array.isArray(estimate.resultRange)) {
    errors.push("AI calculation must include result or resultRange.");
  }

  return result(errors);
}

export function validateAiRecommendation(recommendation: Partial<AiRecommendation>): AiValidationResult {
  const errors: string[] = [];

  if (!hasText(recommendation.id)) errors.push("AI recommendation id is required.");
  if (!hasText(recommendation.title)) errors.push("AI recommendation title is required.");
  if (!hasText(recommendation.reason)) errors.push("AI recommendation reason is required.");
  if (!hasText(recommendation.verdict)) errors.push("AI recommendation verdict is required.");
  if (!hasText(recommendation.confidence)) errors.push("AI recommendation confidence is required.");
  if (!Array.isArray(recommendation.dependencies)) errors.push("AI recommendation dependencies must be an array.");
  if (!Array.isArray(recommendation.missingData)) errors.push("AI recommendation missingData must be an array.");
  if (!Array.isArray(recommendation.assumptions)) errors.push("AI recommendation assumptions must be an array.");
  if (typeof recommendation.isNegativeRecommendation !== "boolean") {
    errors.push("AI recommendation isNegativeRecommendation must be boolean.");
  }

  for (const key of ["estimatedCost", "estimatedSavings", "payback"] as const) {
    const traceable = recommendation[key];
    if (traceable) {
      const validation = validateTraceableNumber(traceable, key);
      errors.push(...validation.errors);
    }
  }

  return result(errors);
}

export function validateDeterministicAuthority(args: {
  deterministicValue?: unknown;
  aiValue?: { sourceType?: string };
}): AiValidationResult {
  if (args.deterministicValue !== undefined && args.aiValue?.sourceType === "ai_estimate") {
    return result(["AI estimate cannot overwrite an existing deterministic result."]);
  }

  return result([]);
}

export function validateAiBeforeRender<T>(output: Partial<AiOutputEnvelope<T>>): AiValidationResult {
  return validateAiOutputEnvelope(output);
}
