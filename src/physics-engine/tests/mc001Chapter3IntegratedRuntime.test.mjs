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

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function assertContainsNoFunction(value, path = "fixture") {
  if (typeof value === "function") {
    throw new Error(`${path} must not contain runtime functions`);
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assertContainsNoFunction(child, `${path}.${key}`);
  }
}

test("runs the 12-month Chapter 3 integrated runtime chain with fixed expected outputs", () => {
  const result = calculateMc001Chapter3IntegratedRuntime(
    mc001Chapter3ReferenceBuildingFixture.input
  );
  const expected = mc001Chapter3ReferenceBuildingFixture.expected;

  assert.equal(result.status, "calculated");
  assert.equal(result.monthCount, 12);
  assert.equal(result.monthly.length, 12);
  const pcmLedger =
    mc001Chapter3ReferenceBuildingFixture.derivationLedger.pcmStorageRelationsKWhOrKg;

  for (const [index, month] of result.monthly.entries()) {
    assertCloseTo(month.totals.heatingInputKWh, expected.monthlyHeatingInputKWh[index]);
    assertCloseTo(month.totals.coolingInputKWh, expected.monthlyCoolingInputKWh[index]);
    assertCloseTo(month.totals.dhwInputKWh, expected.monthlyDhwInputKWh[index]);
    assertCloseTo(
      month.totals.ventilationAuxiliaryKWh,
      expected.monthlyVentilationAuxiliaryKWh[index]
    );
    assert.equal(month.totals.lightingEnergyKWh, 20);
    assertCloseTo(
      month.totals.pcmSensibleSolidStorageEnergyKWh,
      pcmLedger.monthlySensibleSolidStorageEnergy3_111KWh[index]
    );
    assertCloseTo(
      month.totals.pcmInputEnergyLimitKWh,
      pcmLedger.monthlyInputEnergyLimit3_112KWh[index]
    );
    assertCloseTo(
      month.totals.pcmSolidMassDecreaseKg,
      pcmLedger.monthlySolidMassDecrease3_113Kg[index]
    );
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
  assertCloseTo(
    result.annual.pcmSensibleSolidStorageEnergyKWh,
    sum(pcmLedger.monthlySensibleSolidStorageEnergy3_111KWh)
  );
  assertCloseTo(
    result.annual.pcmInputEnergyLimitKWh,
    sum(pcmLedger.monthlyInputEnergyLimit3_112KWh)
  );
  assertCloseTo(
    result.annual.pcmSolidMassDecreaseKg,
    sum(pcmLedger.monthlySolidMassDecrease3_113Kg)
  );
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

test("certifies the Chapter 3 fixed 12-month fixture derivation ledger", () => {
  const { input, expected, derivationLedger } = mc001Chapter3ReferenceBuildingFixture;

  assert.equal(derivationLedger.expectedValuesPolicy, "hard_coded_constants_not_generated_by_runtime");
  assertContainsNoFunction(expected, "expected");
  assertContainsNoFunction(derivationLedger, "derivationLedger");
  assert.deepEqual(
    input.months.map(month => month.chapter2Useful.qHndKWh),
    derivationLedger.chapter2UsefulInputsKWh.qHnd
  );
  assert.deepEqual(
    input.months.map(month => month.chapter2Useful.qCndKWh),
    derivationLedger.chapter2UsefulInputsKWh.qCnd
  );
  assert.deepEqual(
    input.months[0].heatingStages.map(stage => stage.stageId),
    derivationLedger.stageOrder.heating
  );
  assert.deepEqual(
    input.months[0].coolingStages.map(stage => stage.stageId),
    derivationLedger.stageOrder.cooling
  );
  assert.deepEqual(
    input.months[0].dhw.stages.map(stage => stage.stageId),
    derivationLedger.stageOrder.dhw
  );
  assertCloseTo(sum(expected.monthlyHeatingInputKWh), expected.annual.heatingInputKWh);
  assertCloseTo(sum(expected.monthlyCoolingInputKWh), expected.annual.coolingInputKWh);
  assertCloseTo(sum(expected.monthlyDhwInputKWh), expected.annual.dhwInputKWh);
  assertCloseTo(
    sum(expected.monthlyVentilationAuxiliaryKWh),
    expected.annual.ventilationAuxiliaryKWh
  );
  assertCloseTo(
    expected.monthlyHeatingInputKWh[0] - input.months[0].chapter2Useful.qHndKWh,
    derivationLedger.monthlyStageDeltasKWh.heating.total
  );
  assertCloseTo(
    expected.monthlyCoolingInputKWh[6] - input.months[6].chapter2Useful.qCndKWh,
    derivationLedger.monthlyStageDeltasKWh.cooling.total
  );
  assertCloseTo(
    expected.monthlyDhwInputKWh[0] - input.months[0].dhw.usefulDemandKWh,
    derivationLedger.monthlyStageDeltasKWh.dhw.total
  );
  assert.equal(derivationLedger.auxiliarySeparationKWh.lightingMonthlyExplicitBoundary, 20);
  assert.equal(
    derivationLedger.pcmStorageRelationsKWhOrKg.expectedValuesPolicy,
    "hard_coded_constants_not_generated_by_runtime"
  );
  assert.equal(
    derivationLedger.pcmStorageRelationsKWhOrKg.monthlySensibleSolidStorageEnergy3_111KWh.length,
    12
  );
  assert.equal(
    derivationLedger.pcmStorageRelationsKWhOrKg.monthlyInputEnergyLimit3_112KWh.length,
    12
  );
  assert.equal(
    derivationLedger.pcmStorageRelationsKWhOrKg.monthlySolidMassDecrease3_113Kg.length,
    12
  );
  assertCloseTo(
    sum(derivationLedger.pcmStorageRelationsKWhOrKg.monthlySensibleSolidStorageEnergy3_111KWh),
    15.6
  );
  assertCloseTo(
    sum(derivationLedger.pcmStorageRelationsKWhOrKg.monthlyInputEnergyLimit3_112KWh),
    2.4
  );
  assertCloseTo(
    derivationLedger.pcmStorageRelationsKWhOrKg.massLimitedSolidMassDecrease3_113Kg,
    -20
  );
  assert.equal(input.lighting.monthlyEnergyKWh.length, 12);
  assert.equal(expected.annual.lightingEnergyKWh, 240);
  assert.ok(
    derivationLedger.explicitInputBoundaries.includes("SR EN 15193-1 lighting monthly explicit boundary")
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
  assert.ok(sections[0].lines.some(line => line.text.includes("ΔQC,sto,senssld,an")));
  assert.ok(sections[1].lines.some(line => line.text.includes("Q_heating_emission,in")));
  assert.ok(sections[1].lines.some(line => line.text.includes("ΔmC,sto,sld,january")));
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
