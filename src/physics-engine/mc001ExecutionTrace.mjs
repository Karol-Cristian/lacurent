const ARITHMETIC_OPERATORS = new Set([
  "add",
  "subtract",
  "multiply",
  "divide",
  "abs"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function traceInput(value, unit, extra = {}) {
  const amount = finiteNumber(value);
  return {
    value: amount,
    unit,
    ...extra
  };
}

export function inputExpression(name) {
  return { op: "input", name };
}

export function valueExpression(value) {
  return { op: "value", value };
}

export function operatorExpression(op, terms) {
  if (!ARITHMETIC_OPERATORS.has(op)) {
    throw new Error(`Unsupported MC001 trace operator: ${op}`);
  }
  return { op, terms };
}

export function buildArithmeticExecutionTrace({
  formulaId,
  branchId,
  inputs,
  expression,
  rawResult,
  finalResult,
  unit,
  clampApplied = false,
  status = "calculated"
}) {
  return {
    schema: "mc001_execution_trace_v1",
    formulaId,
    branchId,
    inputs,
    expression,
    rawResult,
    finalResult,
    unit,
    clampApplied,
    status
  };
}

export function buildBranchExecutionTrace({
  formulaId,
  branchId,
  inputs = {},
  condition,
  finalResult,
  unit,
  reason
}) {
  return {
    schema: "mc001_execution_trace_v1",
    formulaId,
    branchId,
    inputs,
    condition,
    rawResult: null,
    finalResult,
    unit,
    clampApplied: false,
    status: "branch_result",
    reason
  };
}

export function evaluateMc001TraceExpression(expression, inputs = {}) {
  if (!isPlainObject(expression)) {
    return { ok: false, code: "trace_expression_invalid" };
  }
  if (expression.op === "input") {
    const input = inputs[expression.name];
    const value = finiteNumber(input?.value);
    if (value === null) {
      return { ok: false, code: "trace_expression_missing_input", input: expression.name };
    }
    return { ok: true, value };
  }
  if (expression.op === "value") {
    const value = finiteNumber(expression.value);
    if (value === null) {
      return { ok: false, code: "trace_expression_invalid_literal" };
    }
    return { ok: true, value };
  }
  if (!ARITHMETIC_OPERATORS.has(expression.op) || !Array.isArray(expression.terms)) {
    return { ok: false, code: "trace_expression_unknown_operator" };
  }
  const evaluated = [];
  for (const term of expression.terms) {
    const value = evaluateMc001TraceExpression(term, inputs);
    if (!value.ok) return value;
    evaluated.push(value.value);
  }
  if (expression.op === "abs") {
    if (evaluated.length !== 1) return { ok: false, code: "trace_expression_invalid_abs_arity" };
    return { ok: true, value: Math.abs(evaluated[0]) };
  }
  if (evaluated.length < 2) {
    return { ok: false, code: "trace_expression_invalid_arity" };
  }
  if (expression.op === "add") {
    return { ok: true, value: evaluated.reduce((sum, value) => sum + value, 0) };
  }
  if (expression.op === "multiply") {
    return { ok: true, value: evaluated.reduce((product, value) => product * value, 1) };
  }
  if (expression.op === "subtract") {
    return { ok: true, value: evaluated.slice(1).reduce((result, value) => result - value, evaluated[0]) };
  }
  if (expression.op === "divide") {
    return {
      ok: true,
      value: evaluated.slice(1).reduce((result, value) => result / value, evaluated[0])
    };
  }
  return { ok: false, code: "trace_expression_unknown_operator" };
}

export function validateMc001ExecutionTrace(trace, { tolerance = 1e-9 } = {}) {
  if (!isPlainObject(trace) || trace.schema !== "mc001_execution_trace_v1") {
    return { ok: false, code: "trace_invalid_schema" };
  }
  const finalResult = finiteNumber(trace.finalResult);
  if (finalResult === null) return { ok: false, code: "trace_invalid_final_result" };
  if (trace.status === "branch_result") {
    if (!trace.condition || trace.condition.evaluated !== true) {
      return { ok: false, code: "trace_branch_condition_not_true" };
    }
    return { ok: true, evaluatedExpression: null };
  }
  const rawResult = finiteNumber(trace.rawResult);
  if (rawResult === null) return { ok: false, code: "trace_invalid_raw_result" };
  const evaluated = evaluateMc001TraceExpression(trace.expression, trace.inputs);
  if (!evaluated.ok) return evaluated;
  if (Math.abs(evaluated.value - rawResult) > tolerance) {
    return {
      ok: false,
      code: "trace_raw_result_mismatch",
      evaluatedExpression: evaluated.value,
      rawResult
    };
  }
  if (trace.clampApplied !== true && Math.abs(rawResult - finalResult) > tolerance) {
    return {
      ok: false,
      code: "trace_final_result_mismatch",
      rawResult,
      finalResult
    };
  }
  return { ok: true, evaluatedExpression: evaluated.value };
}
