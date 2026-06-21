import assert from "node:assert/strict";
import {
  calculateAnnualHeatingNeedSum,
  calculateMonthlyHeatingNeed,
  calculateMonthlyTotalGains,
  calculateMonthlyTotalHeatTransfer
} from "../../monthlyBalance.mjs";
import { fixture006HeatingNeedTableSummary } from "./fixture006HeatingNeedTableSummary.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function percentageError(delta, expected) {
  if (expected === 0) {
    return delta === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return Math.abs(delta / expected) * 100;
}

function metric({ metricKey, expected, calculated, toleranceAbs = null }) {
  const delta = calculated - expected;
  const absoluteDelta = Math.abs(delta);
  const percentError = percentageError(delta, expected);
  const toleranceText = toleranceAbs === null ? "not_asserted" : toleranceAbs;

  console.log(
    `METRIC ${fixture006HeatingNeedTableSummary.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceText}`
  );

  if (toleranceAbs !== null) {
    assert.ok(
      absoluteDelta <= toleranceAbs,
      `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
    );
  }

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function calculateHeatingNeed(row) {
  return calculateMonthlyHeatingNeed({
    gammaH: row.gammaH,
    qHhtMonthly: row.expectedQHhtKWh,
    etaHgnMonthly: row.etaHgn,
    qHgnMonthly: row.expectedQHgnKWh
  });
}

test("validates MC001 fixture 006 monthly total heat transfer rows", () => {
  for (const row of fixture006HeatingNeedTableSummary.monthlyRows) {
    const qHht = calculateMonthlyTotalHeatTransfer({
      qtrMonthly: row.qHtrKWh,
      qveMonthly: row.qHveKWh,
      mode: "heating"
    });

    metric({
      metricKey: `page522.${row.month}.qHhtKWh`,
      expected: row.expectedQHhtKWh,
      calculated: qHht.value,
      toleranceAbs:
        fixture006HeatingNeedTableSummary.tolerances.monthlyTotalHeatTransferAbsKWh
    });

    assert.equal(qHht.formulaId, "MC001_MONTHLY_TOTAL_HEAT_TRANSFER");
    assert.deepEqual(qHht.warnings, []);
  }
});

test("validates MC001 fixture 006 monthly total gains rows", () => {
  for (const row of fixture006HeatingNeedTableSummary.monthlyRows) {
    const qHgn = calculateMonthlyTotalGains({
      qintMonthly: row.qHintKWh,
      qsolMonthly: row.qHsolKWh,
      mode: "heating"
    });

    metric({
      metricKey: `page522.${row.month}.qHgnKWh`,
      expected: row.expectedQHgnKWh,
      calculated: qHgn.value,
      toleranceAbs: fixture006HeatingNeedTableSummary.tolerances.monthlyTotalGainsAbsKWh
    });

    assert.equal(qHgn.formulaId, "MC001_MONTHLY_TOTAL_GAINS");
    assert.deepEqual(qHgn.warnings, []);
  }
});

test("validates MC001 fixture 006 helper-compatible monthly heating need rows", () => {
  const executableRows = fixture006HeatingNeedTableSummary.monthlyRows.filter(
    (row) => !row.heatingNeedValidationStatus.startsWith("blocked_")
  );

  for (const row of executableRows) {
    const qHnd = calculateHeatingNeed(row);
    const toleranceAbs =
      row.heatingNeedValidationStatus === "executable_zero"
        ? fixture006HeatingNeedTableSummary.tolerances.monthlyHeatingNeedZeroAbsKWh
        : fixture006HeatingNeedTableSummary.tolerances
            .monthlyHeatingNeedRoundedEtaAbsKWh;

    metric({
      metricKey: `page522.${row.month}.qHndKWh`,
      expected: row.expectedQHndKWh,
      calculated: qHnd.value,
      toleranceAbs
    });

    assert.equal(qHnd.formulaId, "MC001_MONTHLY_HEATING_NEED");
  }
});

test("logs MC001 fixture 006 blocked monthly heating need rows", () => {
  const blockedRows = fixture006HeatingNeedTableSummary.monthlyRows.filter(
    (row) => row.heatingNeedValidationStatus.startsWith("blocked_")
  );

  assert.deepEqual(
    blockedRows.map((row) => [row.month, row.heatingNeedValidationStatus]),
    [
      ["Apr", "blocked_mc001_source_conflict_boundary_continuous_qhnd"],
      ["Sep", "blocked_mc001_source_conflict_boundary_continuous_qhnd"],
      ["Oct", "blocked_mc001_source_conflict_gamma_branch"]
    ]
  );

  for (const row of blockedRows) {
    const qHnd = calculateHeatingNeed(row);

    metric({
      metricKey: `page522.${row.month}.qHndBlockedComparisonKWh`,
      expected: row.expectedQHndKWh,
      calculated: qHnd.value
    });

    assert.equal(qHnd.value, 0);
    assert.ok(row.gammaH > 2);
    assert.ok(row.expectedQHndKWh > 0);
    assert.ok(qHnd.trace.assumptions.includes("heating_branch_gamma_above_2"));
  }
});

function etaFromFigure214({ gammaH, aH }) {
  if (gammaH === 1) {
    return aH / (aH + 1);
  }

  return (1 - gammaH ** aH) / (1 - gammaH ** (aH + 1));
}

test("reconstructs Fixture 006 blocked source-conflict rows as diagnostics only", () => {
  for (const row of fixture006HeatingNeedTableSummary.sourceConflictDiagnostics) {
    const etaHgn = etaFromFigure214({ gammaH: row.gammaH, aH: row.aH });
    const qHgnContKWh = row.gammaH * row.qHhtContKWh;
    const qHndDiagnosticKWh = row.qHhtContKWh - etaHgn * qHgnContKWh;

    metric({
      metricKey: `page522.${row.month}.qHndContinuousColumnDiagnosticKWh`,
      expected: row.expectedQHndKWh,
      calculated: qHndDiagnosticKWh,
      toleranceAbs: row.toleranceAbsKWh
    });

    assert.equal(
      row.diagnosticStatus,
      "reconstructs_anexa_b_but_conflicts_with_figure_2_18_gamma_branch"
    );
    assert.ok(row.gammaH > 2);
  }
});

test("validates MC001 fixture 006 annual heating need sum from displayed monthly values", () => {
  const qHndAnnual = calculateAnnualHeatingNeedSum({
    monthlyValues: fixture006HeatingNeedTableSummary.monthlyRows.map(
      (row) => row.expectedQHndKWh
    )
  });

  metric({
    metricKey: "page522.annualQHndKWh",
    expected: fixture006HeatingNeedTableSummary.expected.annualQHndKWh,
    calculated: qHndAnnual.value,
    toleranceAbs: fixture006HeatingNeedTableSummary.tolerances.annualHeatingNeedAbsKWh
  });

  assert.equal(qHndAnnual.formulaId, "MC001_ANNUAL_HEATING_NEED_SUM");
});

test("documents Fixture 006 blocked rows without inventing inputs", () => {
  assert.deepEqual(
    fixture006HeatingNeedTableSummary.blockedRows.map((row) => row.source),
    [
      "Page 522 leading Dec detailed row",
      "Page 522 continuous QH;tr;cont/QH;ve;cont/QH;ht;cont rows",
      "Page 522 Apr/Sep boundary-month QH;nd rows",
      "Page 522 Oct QH;nd row",
      "Exact monthly QH;nd from displayed etaH;gn"
    ]
  );
});
