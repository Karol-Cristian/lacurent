import { buildMc001ReadOnlyDryRunDiagnosticContract } from "./mc001ReadOnlyDryRunDiagnosticContract.mjs";
import { runMc001ReadOnlyReadinessDryRun } from "./mc001ReadOnlyReadinessDryRunRunner.mjs";

export const MC001_READ_ONLY_SAVED_ANALYSIS_DIAGNOSTIC_DRY_RUN_RUNNER_ID =
  "MC001_READ_ONLY_SAVED_ANALYSIS_DIAGNOSTIC_DRY_RUN_RUNNER_PHASE_DB5";

function dryRunOptionsFrom(options) {
  if (
    options !== null &&
    typeof options === "object" &&
    !Array.isArray(options) &&
    options.dryRunOptions !== undefined
  ) {
    return options.dryRunOptions;
  }

  if (options !== null && typeof options === "object" && !Array.isArray(options)) {
    return options;
  }

  return {};
}

function diagnosticContractOptionsFrom(options) {
  if (
    options !== null &&
    typeof options === "object" &&
    !Array.isArray(options)
  ) {
    return options.diagnosticContractOptions ?? options.contractOptions ?? {};
  }

  return {};
}

export function runMc001ReadOnlySavedAnalysisDiagnosticDryRun(
  snapshot,
  options = {}
) {
  const dryRunResult = runMc001ReadOnlyReadinessDryRun(
    snapshot,
    dryRunOptionsFrom(options)
  );

  return buildMc001ReadOnlyDryRunDiagnosticContract(
    dryRunResult,
    diagnosticContractOptionsFrom(options)
  );
}
