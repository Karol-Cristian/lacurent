import assert from "node:assert/strict";
import {
  buildArithmeticExecutionTrace,
  buildBranchExecutionTrace,
  evaluateMc001TraceExpression,
  inputExpression,
  operatorExpression,
  traceInput,
  validateMc001ExecutionTrace
} from "../mc001ExecutionTrace.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("execution trace evaluator validates nested arithmetic against raw result", () => {
  const inputs = {
    QCgn: traceInput(620, "kWh"),
    etaCht: traceInput(0.5559, "-"),
    QCht: traceInput(1041.3684, "kWh")
  };
  const expression = operatorExpression("subtract", [
    inputExpression("QCgn"),
    operatorExpression("multiply", [inputExpression("etaCht"), inputExpression("QCht")])
  ]);
  const rawResult = 620 - 0.5559 * 1041.3684;
  const trace = buildArithmeticExecutionTrace({
    formulaId: "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND",
    branchId: "figure_2_19_cooling_utilized_transfer_branch",
    inputs,
    expression,
    rawResult,
    finalResult: rawResult,
    unit: "kWh"
  });

  assert.equal(evaluateMc001TraceExpression(expression, inputs).value, rawResult);
  assert.equal(validateMc001ExecutionTrace(trace).ok, true);
});

test("branch result traces require a true condition and do not need arithmetic expression", () => {
  const trace = buildBranchExecutionTrace({
    formulaId: "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND",
    branchId: "inverse_gammaC_greater_than_two_zero_demand",
    inputs: {
      gammaC: traceInput(0.1536, "-")
    },
    condition: {
      expression: "(1 / gammaC) > 2",
      evaluated: true
    },
    finalResult: 0,
    unit: "kWh",
    reason: "Zero useful cooling branch."
  });

  assert.equal(trace.expression, undefined);
  assert.equal(validateMc001ExecutionTrace(trace).ok, true);

  const invalid = {
    ...trace,
    condition: { expression: "(1 / gammaC) > 2", evaluated: false }
  };
  assert.equal(validateMc001ExecutionTrace(invalid).code, "trace_branch_condition_not_true");
});
