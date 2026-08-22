import assert from "node:assert/strict";
import { buildChapter3NotebookSections } from "../mc001Chapter3Notebook.mjs";
import { calculateMc001Chapter3IntegratedRuntime } from "../mc001Chapter3IntegratedRuntime.mjs";
import { validateMc001ExecutionTrace } from "../mc001ExecutionTrace.mjs";
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

test("supports explicitly inactive services without creating artificial system stages", () => {
  const result = calculateMc001Chapter3IntegratedRuntime({
    services: {
      heatingEnabled: false,
      coolingEnabled: false,
      dhwEnabled: false,
      ventilationAhuEnabled: false,
      coolingStoragePcmEnabled: false,
      lightingEnabled: true
    },
    months: mc001Chapter3ReferenceBuildingFixture.input.months.map(month => ({
      month: month.month,
      chapter2Useful: month.chapter2Useful
    })),
    lighting: {
      monthlyEnergyKWh: Array.from({ length: 12 }, () => 3)
    }
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.monthly[0].heating, null);
  assert.equal(result.monthly[0].cooling, null);
  assert.equal(result.annual.heatingInputKWh, 0);
  assert.equal(result.annual.coolingInputKWh, 0);
  assert.equal(result.annual.lightingEnergyKWh, 36);
});

test("does not validate inactive lighting boundary payloads", () => {
  const result = calculateMc001Chapter3IntegratedRuntime({
    services: {
      heatingEnabled: false,
      coolingEnabled: false,
      dhwEnabled: false,
      ventilationAhuEnabled: false,
      coolingStoragePcmEnabled: false,
      lightingEnabled: false
    },
    months: mc001Chapter3ReferenceBuildingFixture.input.months.map(month => ({
      month: month.month,
      chapter2Useful: month.chapter2Useful
    })),
    lighting: {
      monthlyEnergyKWh: [1, 2]
    }
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.lighting, null);
  assert.equal(result.annual.lightingEnergyKWh, 0);
});

test("aggregates explicit parallel Chapter 3 heating systems without hidden allocation defaults", () => {
  const result = calculateMc001Chapter3IntegratedRuntime({
    services: {
      heatingEnabled: true,
      coolingEnabled: false,
      dhwEnabled: false,
      ventilationAhuEnabled: false,
      coolingStoragePcmEnabled: false,
      lightingEnabled: false
    },
    systemMetadata: {
      heatingSystems: [
        {
          systemId: "boiler-loop",
          energyCarrier: "natural_gas",
          generatorType: "condensing_boiler"
        },
        {
          systemId: "electric-backup",
          energyCarrier: "electricity",
          generatorType: "electric_resistance"
        }
      ]
    },
    months: [
      {
        month: "january",
        chapter2Useful: { qHndKWh: 100, qCndKWh: 0 },
        heatingSystems: [
          {
            systemId: "boiler-loop",
            allocationFraction: 0.6,
            stages: [
              { stageId: "emission", lossKWh: 1, auxiliaryKWh: 0.1, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "distribution", lossKWh: 2, auxiliaryKWh: 0.2, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "storage", lossKWh: 0, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "generation", lossKWh: 3, auxiliaryKWh: 0.3, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 }
            ]
          },
          {
            systemId: "electric-backup",
            allocationFraction: 0.4,
            stages: [
              { stageId: "emission", lossKWh: 0.5, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "distribution", lossKWh: 0.5, auxiliaryKWh: 0.1, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "storage", lossKWh: 0, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "generation", lossKWh: 1, auxiliaryKWh: 0.2, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 }
            ]
          }
        ]
      }
    ]
  });

  const heating = result.monthly[0].heating;
  assert.equal(heating.topology.systemCount, 2);
  assert.equal(heating.topology.allocationPolicy, "explicit_allocation_fraction");
  assertCloseTo(heating.systemResults[0].allocatedUsefulDemandKWh, 60);
  assertCloseTo(heating.systemResults[1].allocatedUsefulDemandKWh, 40);
  assertCloseTo(heating.systemResults[0].finalStageInputKWh, 66);
  assertCloseTo(heating.systemResults[1].finalStageInputKWh, 42);
  assertCloseTo(heating.finalStageInputKWh, 108);
  assertCloseTo(result.energyByCarrier.natural_gas, 66);
  assertCloseTo(result.energyByCarrier.electricity, 42);
  assert.equal(heating.stageResults.length, 4);
  assert.deepEqual(validateMc001ExecutionTrace(heating.stageResults[0].inputEnergy.executionTrace), {
    ok: true,
    evaluatedExpression: null
  });
  assert.deepEqual(validateMc001ExecutionTrace(heating.systemResults[0].stageResults[0].inputEnergy.executionTrace), {
    ok: true,
    evaluatedExpression: null
  });
});

test("calculates one physical shared generator for heating and DHW without double counting", () => {
  const result = calculateMc001Chapter3IntegratedRuntime({
    services: {
      heatingEnabled: true,
      coolingEnabled: false,
      dhwEnabled: true,
      ventilationAhuEnabled: false,
      coolingStoragePcmEnabled: false,
      lightingEnabled: false
    },
    sharedComponents: {
      generators: [
        {
          componentId: "shared-boiler-1",
          enabled: true,
          generatorType: "condensing_boiler",
          energyCarrier: "natural_gas",
          auxiliaryCarrier: "electricity",
          controlLossFactor: 1.05,
          operationHours: 100,
          lossPowerKW: 0.2,
          auxiliaryPowerKW: 0.05,
          recoveredAuxiliaryFraction: 0.2,
          auxiliaryRecoverableFractionToHeating: 0.5,
          lossRecoverableFractionToHeating: 0.3,
          boilerRoomRecoveryFactor: 0.1,
          renewableGeneratorHeatKWh: 0,
          dhwStorageOrDistributionLossKWh: 0,
          serviceAllocationFractions: {
            heating: 0.65,
            dhw: 0.35
          }
        }
      ]
    },
    months: [
      {
        month: "january",
        chapter2Useful: { qHndKWh: 100, qCndKWh: 0 },
        heatingSystems: [
          {
            systemId: "heating-loop",
            allocationFraction: 1,
            metadata: {
              generatorRef: "shared-boiler-1",
              energyCarrier: "natural_gas"
            },
            stages: [
              { stageId: "emission", lossKWh: 1, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "distribution", lossKWh: 2, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "storage", lossKWh: 0, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
              { stageId: "generation", lossKWh: 0, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 }
            ]
          }
        ],
        dhw: {
          usefulDemandKWh: 50,
          systems: [
            {
              systemId: "dhw-loop",
              allocationFraction: 1,
              metadata: {
                generatorRef: "shared-boiler-1",
                energyCarrier: "natural_gas"
              },
              stages: [
                { stageId: "distribution", lossKWh: 2, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
                { stageId: "storage", lossKWh: 1, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 },
                { stageId: "generation", lossKWh: 0, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 }
              ]
            }
          ]
        }
      }
    ]
  });

  const shared = result.monthly[0].sharedGenerators[0];
  assert.equal(shared.componentId, "shared-boiler-1");
  assert.deepEqual(shared.connectedServices, ["heating", "dhw"]);
  assertCloseTo(shared.centralOutputEnergy.valueKWh, 161.15);
  assertCloseTo(shared.generationLoss.valueKWh, 20);
  assertCloseTo(shared.auxiliaryEnergy.valueKWh, 5);
  assertCloseTo(shared.recoveredAuxiliaryTotal.valueKWh, 1);
  assertCloseTo(shared.recoverableGenerationLossTotal.valueKWh, 8.25);
  assertCloseTo(shared.fuelInput.valueKWh, 180.15);
  assertCloseTo(result.energyByCarrier.natural_gas, 180.15);
  assertCloseTo(result.energyByCarrier.electricity, 5);
  assertCloseTo(result.monthly[0].heating.finalStageInputKWh, 120.3475);
  assertCloseTo(result.monthly[0].dhw.finalStageInputKWh, 64.8025);
  assertCloseTo(shared.invariants.serviceFuelAllocationKWh, shared.physicalTotals.fuelInputKWh);
  assertCloseTo(shared.invariants.serviceLossAllocationKWh, shared.physicalTotals.generationLossKWh);
  assertCloseTo(shared.invariants.serviceAuxiliaryAllocationKWh, shared.physicalTotals.auxiliaryKWh);
  assertCloseTo(
    result.energyByService.heating + result.energyByService.domesticHotWater,
    result.energyByCarrier.natural_gas + result.energyByCarrier.electricity
  );
  assert.deepEqual(validateMc001ExecutionTrace(shared.centralOutputEnergy.executionTrace), {
    ok: true,
    evaluatedExpression: null
  });
});

test("rejects multiple Chapter 3 systems when explicit allocation fractions do not sum to one", () => {
  assert.throws(
    () =>
      calculateMc001Chapter3IntegratedRuntime({
        services: {
          heatingEnabled: true,
          coolingEnabled: false,
          dhwEnabled: false,
          ventilationAhuEnabled: false,
          coolingStoragePcmEnabled: false,
          lightingEnabled: false
        },
        months: [
          {
            month: "january",
            chapter2Useful: { qHndKWh: 100, qCndKWh: 0 },
            heatingSystems: [
              {
                systemId: "boiler-loop",
                allocationFraction: 0.5,
                stages: [
                  { stageId: "emission", lossKWh: 0, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 }
                ]
              },
              {
                systemId: "electric-backup",
                allocationFraction: 0.2,
                stages: [
                  { stageId: "emission", lossKWh: 0, auxiliaryKWh: 0, auxiliaryRecoveredFraction: 0, lossRecoveredFraction: 0, auxiliaryRecoverableFractionToHeating: 0, lossRecoverableFractionToHeating: 0 }
                ]
              }
            ]
          }
        ]
      }),
    /allocationFraction values must sum to 1/
  );
});
