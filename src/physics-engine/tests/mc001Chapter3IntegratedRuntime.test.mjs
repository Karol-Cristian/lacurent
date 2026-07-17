import assert from "node:assert/strict";
import { buildChapter3NotebookSections } from "../mc001Chapter3Notebook.mjs";
import { calculateMc001Chapter3IntegratedRuntime } from "../mc001Chapter3IntegratedRuntime.mjs";
import { mc001Chapter3ReferenceBuildingFixture } from "./fixtures/mc001Chapter3ReferenceBuildingFixture.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assertCloseTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} is not close to ${expected}`);
}

test("runs the 12-month Chapter 3 integrated runtime chain with fixed expected outputs", () => {
  const result = calculateMc001Chapter3IntegratedRuntime(
    mc001Chapter3ReferenceBuildingFixture.input
  );
  const expected = mc001Chapter3ReferenceBuildingFixture.expected;

  assert.equal(result.status, "calculated");
  assert.equal(result.monthCount, 12);
  assert.equal(result.monthly.length, 12);

  for (const [index, month] of result.monthly.entries()) {
    assertCloseTo(month.totals.heatingInputKWh, expected.monthlyHeatingInputKWh[index]);
    assertCloseTo(month.totals.coolingInputKWh, expected.monthlyCoolingInputKWh[index]);
    assertCloseTo(month.totals.dhwInputKWh, expected.monthlyDhwInputKWh[index]);
    assertCloseTo(
      month.totals.ventilationAuxiliaryKWh,
      expected.monthlyVentilationAuxiliaryKWh[index]
    );
    assert.equal(month.totals.lightingEnergyKWh, 20);
    assert.equal(month.heating.stageResults.length, 4);
    assert.equal(month.cooling.stageResults.length, 4);
    assert.equal(month.dhw.stageResults.length, 3);
  }

  assertCloseTo(result.annual.heatingInputKWh, expected.annual.heatingInputKWh);
  assertCloseTo(result.annual.coolingInputKWh, expected.annual.coolingInputKWh);
  assertCloseTo(result.annual.dhwInputKWh, expected.annual.dhwInputKWh);
  assertCloseTo(
    result.annual.ventilationAuxiliaryKWh,
    expected.annual.ventilationAuxiliaryKWh
  );
  assertCloseTo(result.annual.lightingEnergyKWh, expected.annual.lightingEnergyKWh);
  assertCloseTo(result.annual.heatingAuxiliaryKWh, expected.annual.heatingAuxiliaryKWh);
  assertCloseTo(result.annual.coolingAuxiliaryKWh, expected.annual.coolingAuxiliaryKWh);
  assertCloseTo(
    result.annual.heatingInputKWh,
    result.monthly.reduce((total, month) => total + month.totals.heatingInputKWh, 0)
  );
  assertCloseTo(
    result.annual.coolingInputKWh,
    result.monthly.reduce((total, month) => total + month.totals.coolingInputKWh, 0)
  );
});

test("exposes Chapter 3 integrated runtime in compact notebook sections", () => {
  const result = calculateMc001Chapter3IntegratedRuntime(
    mc001Chapter3ReferenceBuildingFixture.input
  );
  const sections = buildChapter3NotebookSections(result);

  assert.equal(sections.length, 13);
  assert.equal(sections[0].sectionId, "chapter3.annual");
  assert.ok(sections[0].lines.some(line => line.text.includes("QH,sys,an")));
  assert.ok(sections[1].lines.some(line => line.text.includes("Q_heating_emission,in")));
  assert.ok(sections[1].lines.some(line => line.text.includes("WL,january")));
  assert.ok(
    sections.every(section =>
      section.lines.every(line => !line.text.includes("Building DNA pipeline"))
    )
  );
});

test("rejects incomplete integrated monthly chains instead of inventing defaults", () => {
  assert.throws(
    () =>
      calculateMc001Chapter3IntegratedRuntime({
        months: [
          {
            month: "january",
            chapter2Useful: { qHndKWh: 1, qCndKWh: 0 },
            heatingStages: [],
            coolingStages: []
          }
        ]
      }),
    /heating.january.stages must be a non-empty array/
  );
});
