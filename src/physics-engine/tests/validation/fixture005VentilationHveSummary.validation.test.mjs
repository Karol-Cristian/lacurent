import assert from "node:assert/strict";
import {
  calculateBve,
  calculateMonthlyVentilationTransfer,
  calculateVentilationHeatTransferCoefficient
} from "../../ventilationCoefficients.mjs";
import { fixture005VentilationHveSummary } from "./fixture005VentilationHveSummary.mjs";

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
    `METRIC ${fixture005VentilationHveSummary.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceText}`
  );

  if (toleranceAbs !== null) {
    assert.ok(
      absoluteDelta <= toleranceAbs,
      `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
    );
  }

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function calculateSourceImpliedHve() {
  return calculateVentilationHeatTransferCoefficient({
    rhoA:
      fixture005VentilationHveSummary.airflow.calculatorFactorization.rhoA,
    ca: fixture005VentilationHveSummary.airflow.calculatorFactorization.ca,
    flows: [
      {
        flowId: "page_520_natural_ventilation",
        airflowM3h: fixture005VentilationHveSummary.airflow.airflowM3h,
        bve: 1,
        fveDyn: fixture005VentilationHveSummary.ventilationContext.fveDynMonthly
      }
    ]
  });
}

test("validates MC001 fixture 005 bve for natural exterior ventilation", () => {
  for (const row of fixture005VentilationHveSummary.monthlyRows) {
    const bve = calculateBve({
      thetaInt: row.thetaIntC,
      thetaSupply: row.thetaExternalC,
      thetaExternal: row.thetaExternalC
    });

    metric({
      metricKey: `page522.${row.month}.bve`,
      expected: row.expectedBve,
      calculated: bve.value,
      toleranceAbs: fixture005VentilationHveSummary.tolerances.bveAbs
    });

    assert.equal(bve.formulaId, "MC001_2_31_BVE");
    assert.ok(
      bve.trace.assumptions.includes("supply_air_equals_external_air_bve_expected_1")
    );
  }
});

test("validates MC001 fixture 005 page 520 Hve from explicit airflow and source-implied volumetric heat capacity", () => {
  const hve = calculateSourceImpliedHve();

  metric({
    metricKey: "page520.hveFromExplicitAirflowWPerK",
    expected: fixture005VentilationHveSummary.airflow.expectedHveWPerK,
    calculated: hve.value,
    toleranceAbs: fixture005VentilationHveSummary.tolerances.hveAbsWPerK
  });

  assert.equal(hve.formulaId, "MC001_2_30_HVE");
  assert.deepEqual(hve.warnings, []);
  assert.ok(hve.trace.assumptions.includes("airflow_m3h_converted_to_m3s"));
});

test("logs page 172 AHU constants mismatch without using it as the Hve pass criterion", () => {
  const constants = fixture005VentilationHveSummary.page172ConstantsComparison;
  const comparisonHve = calculateVentilationHeatTransferCoefficient({
    rhoA: constants.rhoAKgPerM3,
    ca: constants.caJPerKgK,
    flows: [
      {
        flowId: "page_172_constants_comparison",
        airflowM3h: fixture005VentilationHveSummary.airflow.airflowM3h,
        bve: 1,
        fveDyn: fixture005VentilationHveSummary.ventilationContext.fveDynMonthly
      }
    ]
  });

  const comparison = metric({
    metricKey: "page172ConstantsComparison.hveWPerK",
    expected: fixture005VentilationHveSummary.airflow.expectedHveWPerK,
    calculated: comparisonHve.value
  });

  assert.ok(comparison.absoluteDelta > 1);
  assert.match(constants.blockedReason, /not used as the page 520 pass criterion/);
});

test("validates MC001 fixture 005 monthly Qve rows from page 522", () => {
  for (const row of fixture005VentilationHveSummary.monthlyRows) {
    const qve = calculateMonthlyVentilationTransfer({
      hve: fixture005VentilationHveSummary.airflow.expectedHveWPerK,
      thetaInt: row.thetaIntC,
      thetaExternalMonthly: row.thetaExternalC,
      deltaHours: row.deltaHours,
      thetaExternalMonthlySource: `MC001 Anexa B page 522 ${row.month}`
    });

    metric({
      metricKey: `page522.${row.month}.qveKWh`,
      expected: row.expectedQveKWh,
      calculated: qve.value,
      toleranceAbs: fixture005VentilationHveSummary.tolerances.monthlyQveAbsKWh
    });

    assert.equal(qve.formulaId, "MC001_2_29_Q_VENTILATION_MONTHLY");
    assert.deepEqual(qve.warnings, []);
  }
});

test("documents Fixture 005 blocked ventilation paths without inventing inputs", () => {
  assert.deepEqual(fixture005VentilationHveSummary.blockedCalculators, [
    {
      functionName: "calculateAirflowFromACH",
      reason: "No ACH value and no heated volume are displayed for this MC001 example."
    },
    {
      functionName: "calculateBveFromUnconditionedZone",
      reason:
        "No bztu value or unconditioned-zone ventilation source is provided for this MC001 example."
    }
  ]);

  assert.deepEqual(
    fixture005VentilationHveSummary.blockedRows.map((row) => row.source),
    ["Page 520 independent rhoA * ca values", "Fan/AHU ventilation electricity"]
  );
});
