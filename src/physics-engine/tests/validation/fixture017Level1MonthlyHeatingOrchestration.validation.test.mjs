import assert from "node:assert/strict";
import {
  createMc001Level1CoreOrchestrator,
  validateMc001Level1CoreInputPack
} from "../../mc001Level1CoreOrchestrator.mjs";
import { fixture017Level1MonthlyHeatingOrchestration as fixture } from "./fixture017Level1MonthlyHeatingOrchestration.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function metric({ metricKey, expected, calculated }) {
  const matched = Object.is(expected, calculated);

  console.log(
    `METRIC ${fixture.fixtureId}.${metricKey} expected=${expected} summarized=${calculated} matched=${matched}`
  );

  assert.equal(calculated, expected, metricKey);
}

function monthIds(rows) {
  return rows.map((row) => row.month);
}

test("validates Fixture 017 explicit input pack", () => {
  assert.equal(validateMc001Level1CoreInputPack(fixture.inputPack), true);
  assert.equal(fixture.inputPack.monthlyHeating.unit, "kWh");
  assert.equal(fixture.inputPack.monthlyHeating.monthlyRows.length, 12);
});

test("validates Fixture 017 fixed Level 1 output contract remains core only", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);

  assert.equal(result.orchestratorType, fixture.expected.orchestratorType);
  assert.equal(result.level, fixture.expected.level);
  assert.equal(result.isProductionOrchestrator, false);
  assert.equal(result.isCertificateWorkflow, false);
  assert.equal(result.validationStatus, fixture.expected.validationStatus);
});

test("validates Fixture 017 monthly heating summary counts", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const summary = result.monthlyHeatingSummary;

  metric({
    metricKey: "monthlyHeating.validatedMonthCount",
    expected: fixture.expected.validatedMonthCount,
    calculated: summary.validatedMonthCount
  });
  metric({
    metricKey: "monthlyHeating.blockedMonthCount",
    expected: fixture.expected.blockedMonthCount,
    calculated: summary.blockedMonthCount
  });
  metric({
    metricKey: "monthlyHeating.ambiguousMonthCount",
    expected: fixture.expected.ambiguousMonthCount,
    calculated: summary.ambiguousMonthCount
  });

  assert.deepEqual(monthIds(summary.validatedMonths), fixture.expected.validatedMonths);
  assert.deepEqual(monthIds(summary.blockedMonths), fixture.expected.blockedMonths);
  assert.deepEqual(monthIds(summary.ambiguousMonths), fixture.expected.ambiguousMonths);
});

test("validates Fixture 017 annual displayed heating need as reconciliation only", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const summary = result.monthlyHeatingSummary;

  metric({
    metricKey: "monthlyHeating.annualDisplayedHeatingNeed",
    expected: fixture.expected.annualDisplayedHeatingNeed,
    calculated: summary.annualDisplayedHeatingNeed
  });
  assert.equal(summary.isCompleteAnnualMethodology, false);
  assert.equal(summary.methodologyStatus, fixture.expected.methodologyStatus);
});

test("validates Fixture 017 preserves blocked and ambiguous months", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const summary = result.monthlyHeatingSummary;

  for (const row of summary.blockedMonths) {
    assert.equal(row.QHnd, null);
    assert.ok(row.reason.length > 0);
    assert.ok(row.sourceDisplayedQHnd > 0);
  }

  for (const row of summary.ambiguousMonths) {
    assert.equal(row.QHnd, null);
    assert.ok(row.reason.length > 0);
    assert.ok(row.sourceDisplayedQHnd > 0);
  }

  assert.deepEqual(monthIds(summary.blockedMonths), ["Apr", "Sep"]);
  assert.deepEqual(monthIds(summary.ambiguousMonths), ["Oct"]);
});

test("validates Fixture 017 output is serializable and not a Level 2 or certificate workflow", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const serialized = JSON.stringify(result);
  const parsed = JSON.parse(serialized);

  assert.deepEqual(parsed, result);
  assert.equal("certificate" in result, false);
  assert.equal("cpe" in result, false);
  assert.equal("level2Audit" in result, false);
  assert.equal(serialized.includes("officialCertificate"), false);
  assert.equal(serialized.includes("productionOrchestrator"), false);
});
