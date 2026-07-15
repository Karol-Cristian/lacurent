import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingTechnicalWorkspace,
  buildChapter2UsefulDemandPhysicsInput,
  buildEnvelopeAssemblyPhysicsInput,
  buildEnvelopeTransmissionPhysicsInput,
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAdvancedModel,
  createBuildingDnaFromAssistedAnswers,
  createP1SeedGeometry,
  applyBuildingDnaOverride
} from "../../building-platform/index.mjs";
import { createP1SeedMonthlyProfiles } from "../../building-platform/tests/fixtures/p1SeedMonthlyProfiles.mjs";
import {
  ASSISTED_WIZARD_DEMO_FIXTURE,
  getAssistedWizardDemoFixture,
  mapWizardAnswersToAssistedAnswers,
  buildWizardEngineeringPreview
} from "../../../js/building-platform-wizard.mjs";
import {
  calculateMc001EnvelopeAssemblyUValueExplicit,
  calculateMc001EnvelopeTransmissionCoefficientExplicit
} from "../mc001EnvelopePhysicsCalculation.mjs";
import { calculateMc001MonthlyTransmissionEnergyExplicit } from "../mc001MonthlyTransmissionEnergyCalculation.mjs";
import {
  calculateMc001MonthlyVentilationTransferExplicit,
  calculateMc001VentilationHeatTransferCoefficient
} from "../mc001VentilationTransferCalculation.mjs";
import { calculateMc001ExplicitTotalHeatTransferSummary } from "../mc001ExplicitTotalHeatTransferCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "../mc001MonthlyHeatGainsCalculation.mjs";
import { calculateMc001MonthlySolarGainsExplicit } from "../mc001SolarGainsCalculation.mjs";
import { calculateMc001RestrictedHeatingQhndExplicit } from "../mc001RestrictedHeatingQhndCalculation.mjs";
import { calculateMc001CoolingUsefulDemandExplicit } from "../mc001CoolingUsefulDemandCalculation.mjs";
import { calculateMc001HeatingIntermittencyExplicit } from "../mc001HeatingIntermittencyCalculation.mjs";
import { calculateMc001CoolingIntermittencyExplicit } from "../mc001CoolingIntermittencyCalculation.mjs";
import { calculateMc001LatentDemandExplicit } from "../mc001LatentDemandCalculation.mjs";
import {
  P2V_DEMO_FIXTURE_SAFETY_METADATA,
  P2V_INDEPENDENT_REFERENCE_BUILDINGS,
  P2V_REQUIRED_DOMAIN_GROUPS,
  P2V_SYNTHETIC_SEASONAL_PROFILE,
  P2V_TOLERANCE_POLICY,
  P2V_VALIDATION_SCENARIOS,
  P2V_VALIDATION_STATUS,
  summarizeP2VValidationMatrix
} from "./fixtures/mc001Chapter2ValidationMatrixFixture.mjs";

const EPSILON = P2V_TOLERANCE_POLICY.floatingPoint.defaultAbsoluteTolerance;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function close(actual, expected, tolerance = EPSILON) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected} within ${tolerance}`
  );
}

function source(reference, sourceType = "explicit_user_input") {
  return { sourceType, reference };
}

function q(amount, unit, reference, sourceType = "explicit_user_input") {
  return {
    amount,
    unit,
    source: source(reference, sourceType)
  };
}

function blockerCode(result) {
  return result.diagnostics?.blockers?.[0]?.code ?? null;
}

function formData(entries) {
  return {
    get(name) {
      return entries[name];
    }
  };
}

function directMaterial(materialId, lambdaWmK) {
  return {
    materialId,
    lambda: q(lambdaWmK, "W/(m*K)", `${materialId}.lambda`)
  };
}

function correctedMaterial(materialId, lambdaNormatWmK, correctionCoefficientCode) {
  return {
    materialId,
    lambdaNormat: q(lambdaNormatWmK, "W/(m*K)", `${materialId}.lambda_normat`),
    correctionCoefficientCode
  };
}

function layer(layerId, thicknessM, material) {
  return {
    layerId,
    thickness: q(thicknessM, "m", `${layerId}.thickness`),
    material
  };
}

function assembly(assemblyId, layers, surface = { rsi: 0.13, rse: 0.04 }, type = "wall") {
  return {
    assemblyId,
    assemblyType: type,
    source: source(`${assemblyId}.source`),
    layers,
    surfaceResistances: {
      rsi: q(surface.rsi, "m2*K/W", `${assemblyId}.rsi`),
      rse: q(surface.rse, "m2*K/W", `${assemblyId}.rse`)
    }
  };
}

function assemblyResult(results, assemblyId) {
  return results.assemblyResults.find(item => item.assemblyId === assemblyId);
}

function element({
  elementId,
  boundaryType,
  area,
  uValue,
  boundaryCorrectionFactor,
  componentType = "wall"
}) {
  const output = {
    elementId,
    elementType: componentType,
    boundaryType,
    area: q(area, "m2", `${elementId}.area`),
    uValue: q(uValue, "W/(m2*K)", `${elementId}.u`),
    source: source(`${elementId}.source`)
  };
  if (boundaryCorrectionFactor !== undefined) {
    output.boundaryCorrectionFactor = q(
      boundaryCorrectionFactor,
      "dimensionless",
      `${elementId}.factor`
    );
  }
  return output;
}

function assistedAnswers(overrides = {}) {
  return {
    buildingId: "p2v-assisted-brick-house",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      windowsReplaced: true
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    source: {
      reference: "P2V.assisted_reference_building"
    },
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    ...overrides
  };
}

function fixedHeatingCase(extra = {}) {
  return {
    caseId: "p2v-heating",
    month: "january",
    qHht: 1026.72,
    qHgn: 300,
    etaHgn: 0.8,
    source: { reference: "P2V.heating" },
    ...extra
  };
}

await test("P2V validation matrix gate covers required domains with fixed non-runtime oracles", () => {
  const summary = summarizeP2VValidationMatrix();
  assert.equal(P2V_VALIDATION_STATUS, "P2V_VALIDATION_COMPLETE");
  assert.equal(summary.status, "P2V_VALIDATION_COMPLETE");
  assert.ok(summary.scenarioCount >= 20, `scenario count ${summary.scenarioCount}`);
  assert.equal(summary.fixedOracleScenarioCount, summary.scenarioCount);
  assert.ok(summary.independentReferenceBuildingCount >= 5);

  for (const group of P2V_REQUIRED_DOMAIN_GROUPS) {
    assert.ok(summary.groups[group] > 0, group);
  }

  for (const scenario of P2V_VALIDATION_SCENARIOS) {
    assert.ok(scenario.scenarioId, "scenario id");
    assert.ok(scenario.description, scenario.scenarioId);
    assert.ok(P2V_REQUIRED_DOMAIN_GROUPS.includes(scenario.group), scenario.scenarioId);
    assert.ok(scenario.pathsExercised.length > 0, scenario.scenarioId);
    assert.ok(Object.keys(scenario.expectedFinalValues).length > 0, scenario.scenarioId);
    assert.equal(
      String(scenario.oracleSource).includes("runtime"),
      false,
      scenario.scenarioId
    );
  }
});

await test("material and thermal resistance fixed oracles use independent constants", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      assembly("a1-wall", [
        layer("homogeneous", 0.3, directMaterial("explicit_homogeneous", 0.6))
      ]),
      assembly("a2-corrected-masonry", [
        layer(
          "brick",
          0.3,
          correctedMaterial(
            "brick_masonry_pre_1990",
            0.6,
            "zidarie_caramida_uscata_vechime_ge_30_ani"
          )
        )
      ]),
      assembly("a3-multilayer", [
        layer("plaster", 0.02, directMaterial("plaster", 0.7)),
        layer("masonry", 0.3, directMaterial("masonry", 0.6)),
        layer("eps", 0.1, directMaterial("eps", 0.04))
      ]),
      assembly("a4-roof", [
        layer("timber", 0.02, directMaterial("timber", 0.13)),
        layer("mineral-wool", 0.2, directMaterial("mineral_wool", 0.04))
      ], { rsi: 0.1, rse: 0.04 }, "roof"),
      assembly("a5-earth-ceiling", [
        layer("board", 0.025, directMaterial("wood_board", 0.18)),
        layer("earth-fill", 0.15, directMaterial("earth_fill", 0.7)),
        layer("mineral-wool", 0.12, directMaterial("mineral_wool", 0.04))
      ], { rsi: 0.1, rse: 0.04 }, "ceiling")
    ]
  });

  assert.equal(result.status, "ready");
  const a1 = assemblyResult(result, "a1-wall");
  close(a1.layers[0].resistanceM2KPerW, 0.5);
  close(a1.totalResistance, 0.67);
  close(a1.uValue, 1.4925373134328357);

  const a2 = assemblyResult(result, "a2-corrected-masonry");
  close(a2.layers[0].lambdaWmK, 0.618);
  close(a2.layers[0].resistanceM2KPerW, 0.4854368932038835);
  close(a2.totalResistance, 0.6554368932038835);
  close(a2.uValue, 1.5256998963116575);
  assert.equal(a2.layers[0].correctionCoefficientA, 1.03);
  assert.equal(
    a2.layers[0].lambdaFormulaCode,
    "MC001_2_3_LAMBDA_CORRECTION"
  );

  close(assemblyResult(result, "a3-multilayer").totalResistance, 3.1985714285714284);
  close(assemblyResult(result, "a3-multilayer").uValue, 0.31263957123715946);
  close(assemblyResult(result, "a4-roof").totalResistance, 5.293846153846154);
  close(assemblyResult(result, "a4-roof").uValue, 0.18889857599535018);
  close(assemblyResult(result, "a5-earth-ceiling").totalResistance, 3.4931746031746034);
  close(assemblyResult(result, "a5-earth-ceiling").uValue, 0.2862725496432953);
});

await test("envelope Htr identity aggregates Hd Hg Hu Ha and bridge constants", () => {
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      element({ elementId: "wall", boundaryType: "outside_air", area: 50, uValue: 0.5 }),
      element({ elementId: "roof", boundaryType: "outside_air", area: 20, uValue: 0.4, componentType: "roof" }),
      element({ elementId: "ground", boundaryType: "ground", area: 40, uValue: 0.5, boundaryCorrectionFactor: 0.6, componentType: "floor" }),
      element({ elementId: "attic", boundaryType: "unheated_attic", area: 30, uValue: 0.5, boundaryCorrectionFactor: 0.2, componentType: "ceiling" })
    ],
    linearThermalBridges: [
      {
        bridgeId: "corner",
        component: "Hd",
        length: q(20, "m", "corner.length"),
        psi: q(0.04, "W/(m*K)", "corner.psi"),
        source: source("corner.source")
      }
    ],
    pointThermalBridges: [
      {
        bridgeId: "anchor",
        component: "Hu",
        chi: q(0.5, "W/K", "anchor.chi"),
        source: source("anchor.source")
      }
    ]
  });

  assert.equal(result.status, "ready");
  close(result.components.Hd.elementAmount, 33);
  close(result.components.Hd.thermalBridgeAmount, 0.8);
  close(result.components.Hg.amount, 12);
  close(result.components.Hu.elementAmount, 3);
  close(result.components.Hu.thermalBridgeAmount, 0.5);
  close(result.components.Ha.amount, 0);
  close(result.result.amount, 49.3);
  close(
    result.components.Hd.amount +
      result.components.Hg.amount +
      result.components.Hu.amount +
      result.components.Ha.amount,
    result.result.amount
  );
});

await test("monthly transmission ventilation and C5 transfer fixed oracles remain exact", () => {
  const transmission = calculateMc001MonthlyTransmissionEnergyExplicit({
    mode: "explicit_monthly_transmission_energy_v1",
    cases: [
      {
        caseId: "p2v-qtr",
        month: "january",
        calculationMode: "heating",
        htr: q(74.8, "W/K", "p2v.htr"),
        indoorTemperature: q(20, "degC", "p2v.indoor"),
        outdoorTemperature: q(0, "degC", "p2v.outdoor"),
        duration: q(720, "h", "p2v.duration"),
        source: source("p2v.transmission.case")
      }
    ]
  });
  assert.equal(transmission.status, "ready");
  close(transmission.caseResults[0].transmissionEnergy.amount, 1077.12);

  const ventilation = calculateMc001MonthlyVentilationTransferExplicit({
    mode: "explicit_monthly_ventilation_transfer_v1",
    cases: [
      {
        caseId: "p2v-qve",
        month: "january",
        calculationMode: "heating",
        airHeatCapacity: q(1200, "J/(m3*K)", "p2v.air_heat_capacity"),
        components: [
          {
            componentId: "natural-airflow",
            airFlowRate: q(0.05, "m3/s", "p2v.airflow"),
            temperatureCorrectionFactor: q(1, "dimensionless", "p2v.temp_factor"),
            dynamicCorrectionFactor: q(1, "dimensionless", "p2v.dynamic_factor"),
            source: source("p2v.vent.component")
          }
        ],
        indoorTemperature: q(20, "degC", "p2v.vent.indoor"),
        outdoorTemperature: q(0, "degC", "p2v.vent.outdoor"),
        duration: q(720, "h", "p2v.vent.duration"),
        source: source("p2v.vent.case")
      }
    ]
  });
  assert.equal(ventilation.status, "ready");
  close(ventilation.caseResults[0].ventilationHeatTransferCoefficient.amount, 60);
  close(ventilation.caseResults[0].ventilationEnergy.amount, 864);

  const transfer = calculateMc001ExplicitTotalHeatTransferSummary({
    mode: "explicit_total_heat_transfer_summary_v1",
    transmissionEnergy: q(1077.12, "kWh", "p2v.qtr", "explicit_calculated_input"),
    ventilationEnergy: q(864, "kWh", "p2v.qve", "explicit_calculated_input")
  });
  assert.equal(transfer.status, "ready");
  close(transfer.result.amount, 1941.12);
});

await test("solar and heat-gain branch fixtures use fixed transparent opaque and adjacent-zone oracles", () => {
  const solar = calculateMc001MonthlySolarGainsExplicit({
    mode: "monthly_solar_gains_explicit_v1",
    cases: [
      {
        caseId: "p2v-solar",
        month: "january",
        source: { reference: "p2v.solar" },
        transparentElements: [
          {
            elementId: "south-window",
            area: 10,
            obstacleShadingFactor: 0.8,
            solarIrradiation: 100,
            qSky: 5,
            frameFraction: 0.25,
            effectiveSolarTransmittance: 0.7
          }
        ],
        opaqueElements: [
          {
            elementId: "south-wall",
            area: 20,
            obstacleShadingFactor: 0.8,
            solarIrradiation: 100,
            qSky: 2,
            solarAbsorptance: 0.6,
            exteriorSurfaceResistance: 0.04,
            uValue: 0.5
          }
        ]
      }
    ]
  });
  assert.equal(solar.status, "ready");
  close(solar.caseResults[0].transparentElementResults[0].solarGains, 415);
  close(solar.caseResults[0].opaqueElementResults[0].solarGains, 17.2);
  close(solar.caseResults[0].solarGains, 432.2);

  const gains = calculateMc001MonthlyHeatGainsExplicit({
    mode: "monthly_heat_gains_explicit_v1",
    cases: [
      {
        caseId: "p2v-adjacent-gains",
        month: "january",
        internalGains: 100,
        solarGains: 50,
        adjacentUnconditionedZones: [
          {
            zoneId: "ztu-1",
            internalGains: 60,
            solarGains: 40,
            bztu: 0.4,
            distributionFactor: 1,
            gainReductionFactor: 0.5
          }
        ],
        source: { reference: "p2v.gains" }
      }
    ]
  });
  assert.equal(gains.status, "ready");
  close(gains.caseResults[0].adjacentInternalGains, 18);
  close(gains.caseResults[0].adjacentSolarGains, 12);
  close(gains.caseResults[0].internalGains, 118);
  close(gains.caseResults[0].solarGains, 62);
  close(gains.caseResults[0].qHgn, 180);
});

await test("heating useful-demand branches assert fixed normal boundary intermittency and long-unoccupied results", () => {
  const normal = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [fixedHeatingCase()]
  });
  assert.equal(normal.status, "ready");
  close(normal.caseResults[0].qHnd, 786.72);
  assert.equal(normal.caseResults[0].etaHgnOrigin, "explicit_input");

  const derived = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "p2v-heating-derived-aH",
        month: "january",
        qHht: 1026.72,
        qHgn: 300,
        aH: 2,
        source: { reference: "P2V.heating.derived_aH" }
      }
    ]
  });
  assert.equal(derived.status, "ready");
  close(derived.caseResults[0].gammaH, 0.292192613370734);
  close(derived.caseResults[0].etaHgn, 0.9380237833186124);
  close(derived.caseResults[0].qHnd, 745.3128650044164);

  const utilizationDependencies = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "p2v-heating-utilization-dependencies",
        month: "january",
        qHht: 1026.72,
        qHgn: 300,
        utilizationDependencies: {
          effectiveInternalHeatCapacityJPerK: 25200000,
          totalHeatTransferCoefficientWK: 60,
          aH0: 1,
          tauH0: 15
        },
        source: { reference: "P2V.heating.utilization_dependencies" }
      }
    ]
  });
  assert.equal(utilizationDependencies.status, "ready");
  close(utilizationDependencies.caseResults[0].tauH, 116.66666666666667);
  close(utilizationDependencies.caseResults[0].aH, 8.777777777777779);
  close(utilizationDependencies.caseResults[0].qHnd, 726.7243331348052);
  assert.equal(
    utilizationDependencies.caseResults[0].etaHgnOrigin,
    "calculated_from_explicit_time_constant_dependencies"
  );

  const boundary = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "p2v-heating-boundary",
        month: "january",
        qHht: 100,
        qHgn: 300,
        aH: 2,
        source: { reference: "P2V.heating.boundary" }
      }
    ]
  });
  assert.equal(boundary.status, "ready");
  close(boundary.caseResults[0].qHnd, 0);
  assert.equal(boundary.caseResults[0].qHndBranch, "gammaH_greater_than_two_zero_demand");

  const intermittency = calculateMc001HeatingIntermittencyExplicit({
    mode: "heating_intermittency_explicit_v1",
    cases: [
      {
        caseId: "p2v-heating-intermittency",
        qHgn: 300,
        thetaIntSetH: 20,
        thetaExternal: 0,
        transmissionHeatTransferCoefficientWK: 50,
        ventilationHeatTransferCoefficientWK: 10,
        calculationDurationHours: 720,
        tauH: 100,
        reductionPeriods: [
          { periodId: "day", thetaIntSetHLow: 18, reductionDurationHours: 2, repetitionCount: 5 },
          { periodId: "night", thetaIntSetHLow: 16, reductionDurationHours: 8, repetitionCount: 7 },
          { periodId: "wknd", thetaIntSetHLow: 12, reductionDurationHours: 48, repetitionCount: 1 }
        ],
        source: { reference: "P2V.heating.intermittency" }
      }
    ]
  });
  assert.equal(intermittency.status, "ready");
  close(intermittency.caseResults[0].dThetaFloat, 0.3472222222222222);
  close(intermittency.caseResults[0].aHred, 0.9527547486509651);
  close(intermittency.caseResults[0].thetaIntCalcH, 19.0550949730193);
  close(intermittency.caseResults[0].qHht, 823.1801028344338);

  const longUnoccupied = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "p2v-heating-long-unoccupied",
        month: "january",
        longUnoccupiedPeriodAdjustment: {
          qHndOccupied: 1000,
          qHndUnoccupied: 400,
          unoccupiedFraction: 0.25
        },
        source: { reference: "P2V.heating.long_unoccupied" }
      }
    ]
  });
  assert.equal(longUnoccupied.status, "ready");
  close(longUnoccupied.caseResults[0].qHnd, 850);
  assert.equal(
    longUnoccupied.caseResults[0].longUnoccupiedFormulaCode,
    "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"
  );
});

await test("cooling and latent fixed branch fixtures remain separate and independently checked", () => {
  const normalCooling = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "p2v-cooling-normal",
        month: "july",
        qCht: 300,
        qCgn: 600,
        aC: 2,
        aCred: 1,
        source: { reference: "P2V.cooling.normal" }
      }
    ]
  });
  assert.equal(normalCooling.status, "ready");
  close(normalCooling.caseResults[0].gammaC, 2);
  close(normalCooling.caseResults[0].etaCht, 0.8571428571428571);
  close(normalCooling.caseResults[0].qCnd, 342.8571428571429);

  const coolingBoundary = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "p2v-cooling-boundary",
        month: "july",
        qCht: 300,
        qCgn: 100,
        aC: 2,
        aCred: 1,
        source: { reference: "P2V.cooling.boundary" }
      }
    ]
  });
  assert.equal(coolingBoundary.status, "ready");
  close(coolingBoundary.caseResults[0].qCnd, 0);
  assert.equal(
    coolingBoundary.caseResults[0].qCndBranch,
    "inverse_gammaC_greater_than_two_zero_demand"
  );

  const intermittency = calculateMc001CoolingIntermittencyExplicit({
    mode: "cooling_intermittency_explicit_v1",
    cases: [
      {
        caseId: "p2v-cooling-intermittency",
        weekendReductionDurationHours: 72,
        weekendReductionRepetitionCount: 1,
        bCredWknd: 0.5,
        source: { reference: "P2V.cooling.intermittency" }
      }
    ]
  });
  assert.equal(intermittency.status, "ready");
  close(intermittency.caseResults[0].fCredWknd, 0.42857142857142855);
  close(intermittency.caseResults[0].aCred, 0.7857142857142857);

  const longUnoccupied = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "p2v-cooling-long-unoccupied",
        month: "july",
        longUnoccupiedPeriodAdjustment: {
          qCndOccupied: 1200,
          qCndUnoccupied: 600,
          unoccupiedFraction: 0.2
        },
        source: { reference: "P2V.cooling.long_unoccupied" }
      }
    ]
  });
  assert.equal(longUnoccupied.status, "ready");
  close(longUnoccupied.caseResults[0].qCnd, 1080);
  assert.equal(
    longUnoccupied.caseResults[0].longUnoccupiedFormulaCode,
    "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION"
  );

  const latent = calculateMc001LatentDemandExplicit({
    mode: "chapter2_latent_demand_explicit_v1",
    cases: [
      {
        caseId: "p2v-latent",
        month: "january",
        source: { reference: "P2V.latent.case" },
        humidification: {
          monthlyHumidificationFraction: 0.1,
          latentHeatOfVaporizationJPerKg: 2500000,
          latentHeatRecoveryEfficiency: 0.2,
          airDensityKgPerM3: 1.2,
          mechanicalSupplyAirflowM3PerS: 0.05,
          annualMoistureSupplyKgHPerKg: 2,
          source: { reference: "P2V.latent.humidification" }
        },
        dehumidification: {
          sensibleCoolingDemandKwh: 600,
          dehumidificationFraction: 0.25,
          source: { reference: "P2V.latent.dehumidification" }
        }
      }
    ]
  });
  assert.equal(latent.status, "ready");
  close(latent.caseResults[0].humidification.qHUndKwh, 24);
  close(latent.caseResults[0].dehumidification.qDHUndKwh, 150);
  close(latent.summary.annualHumidificationDemandKwh, 24);
  close(latent.summary.annualDehumidificationDemandKwh, 150);
});

await test("mathematical identities and annual aggregation are explicitly protected", () => {
  const assisted = createBuildingDnaFromAssistedAnswers(assistedAnswers()).buildingDna;
  const calculation = calculateChapter2ForBuildingDna(assisted);
  assert.equal(calculation.status, "ready");

  for (const assemblyItem of calculation.assemblyResult.assemblyResults) {
    if (assemblyItem.layers.length === 0) continue;
    const layerSum = assemblyItem.layers.reduce(
      (sum, item) => sum + item.resistanceM2KPerW,
      0
    );
    const airSum = assemblyItem.airLayers.reduce(
      (sum, item) => sum + item.resistanceM2KPerW,
      0
    );
    close(
      assemblyItem.totalResistance,
      assemblyItem.rsi + layerSum + airSum + assemblyItem.rse
    );
    close(assemblyItem.uValue, 1 / assemblyItem.totalResistance);
  }

  const htr = calculation.envelopeTransmissionResult;
  close(
    htr.result.amount,
    htr.components.Hd.amount +
      htr.components.Hg.amount +
      htr.components.Hu.amount +
      htr.components.Ha.amount
  );

  const result = calculation.chapter2Result.result;
  const annualQHnd = result.heatingResult.caseResults.reduce(
    (sum, item) => sum + item.qHnd,
    0
  );
  const annualQCnd = result.coolingResult.caseResults.reduce(
    (sum, item) => sum + item.qCnd,
    0
  );
  close(result.annualQHnd, annualQHnd);
  close(result.annualQCnd, annualQCnd);
  close(result.annualQHnd, 10286.496332703064);
  close(result.annualQCnd, 2786.7333161081524);
  assert.equal(result.combinedUsefulDemandResult.result.totalUsefulDemand, undefined);
});

await test("physical monotonicity protects insulation lambda area bridges ventilation and gains behavior", () => {
  const thin = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      assembly("thin-eps", [
        layer("eps", 0.05, directMaterial("eps", 0.04))
      ])
    ]
  }).assemblyResults[0];
  const thick = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      assembly("thick-eps", [
        layer("eps", 0.15, directMaterial("eps", 0.04))
      ])
    ]
  }).assemblyResults[0];
  assert.ok(thick.totalResistance > thin.totalResistance);
  assert.ok(thick.uValue < thin.uValue);

  const lowLambda = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [assembly("low-lambda", [layer("mat", 0.1, directMaterial("mat", 0.04))])]
  }).assemblyResults[0];
  const highLambda = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [assembly("high-lambda", [layer("mat", 0.1, directMaterial("mat", 0.08))])]
  }).assemblyResults[0];
  assert.ok(highLambda.totalResistance < lowLambda.totalResistance);
  assert.ok(highLambda.uValue > lowLambda.uValue);

  const smallWall = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      element({ elementId: "small-wall", boundaryType: "outside_air", area: 50, uValue: 0.5 })
    ],
    noThermalBridges: true
  });
  const largeWall = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      element({ elementId: "large-wall", boundaryType: "outside_air", area: 80, uValue: 0.5 })
    ],
    noThermalBridges: true
  });
  assert.ok(largeWall.result.amount > smallWall.result.amount);

  const noBridge = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      element({ elementId: "wall-nb", boundaryType: "outside_air", area: 50, uValue: 0.5 })
    ],
    noThermalBridges: true
  });
  const withBridge = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      element({ elementId: "wall-b", boundaryType: "outside_air", area: 50, uValue: 0.5 })
    ],
    linearThermalBridges: [
      {
        bridgeId: "bridge",
        component: "Hd",
        length: q(20, "m", "bridge.length"),
        psi: q(0.04, "W/(m*K)", "bridge.psi"),
        source: source("bridge.source")
      }
    ]
  });
  assert.ok(noBridge.result.amount < withBridge.result.amount);

  const baselineVent = calculateMc001VentilationHeatTransferCoefficient({
    mode: "explicit_ventilation_coefficient_v1",
    airHeatCapacity: q(1200, "J/(m3*K)", "vent.air"),
    components: [
      {
        componentId: "air",
        airFlowRate: q(0.03, "m3/s", "vent.flow"),
        temperatureCorrectionFactor: q(1, "dimensionless", "vent.t"),
        dynamicCorrectionFactor: q(1, "dimensionless", "vent.d"),
        source: source("vent.source")
      }
    ]
  });
  const highVent = calculateMc001VentilationHeatTransferCoefficient({
    mode: "explicit_ventilation_coefficient_v1",
    airHeatCapacity: q(1200, "J/(m3*K)", "vent.air"),
    components: [
      {
        componentId: "air",
        airFlowRate: q(0.06, "m3/s", "vent.flow"),
        temperatureCorrectionFactor: q(1, "dimensionless", "vent.t"),
        dynamicCorrectionFactor: q(1, "dimensionless", "vent.d"),
        source: source("vent.source")
      }
    ]
  });
  assert.ok(highVent.result.amount > baselineVent.result.amount);

  const lowerSolarHeating = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [fixedHeatingCase({ caseId: "solar-low", qHht: 1000, qHgn: 100 })]
  });
  const higherSolarHeating = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [fixedHeatingCase({ caseId: "solar-high", qHht: 1000, qHgn: 200 })]
  });
  assert.ok(higherSolarHeating.caseResults[0].qHnd < lowerSolarHeating.caseResults[0].qHnd);

  const lowerGainsCooling = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "cool-low",
        month: "july",
        qCht: 300,
        qCgn: 600,
        etaCht: 0.5,
        aCred: 1,
        source: { reference: "P2V.cool.low" }
      }
    ]
  });
  const higherGainsCooling = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "cool-high",
        month: "july",
        qCht: 300,
        qCgn: 700,
        etaCht: 0.5,
        aCred: 1,
        source: { reference: "P2V.cool.high" }
      }
    ]
  });
  assert.ok(higherGainsCooling.caseResults[0].qCnd > lowerGainsCooling.caseResults[0].qCnd);
});

await test("differential path tests compare equivalent physical models", () => {
  const directLambda = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      assembly("direct-lambda", [
        layer("brick", 0.3, directMaterial("brick", 0.618))
      ])
    ]
  }).assemblyResults[0];
  const correctedLambda = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      assembly("corrected-lambda", [
        layer(
          "brick",
          0.3,
          correctedMaterial(
            "brick",
            0.6,
            "zidarie_caramida_uscata_vechime_ge_30_ani"
          )
        )
      ])
    ]
  }).assemblyResults[0];
  close(directLambda.uValue, correctedLambda.uValue);

  const directQHgn = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [fixedHeatingCase({ caseId: "direct-qhgn", qHgn: 300, aH: undefined })]
  });
  const derivedQHgn = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "derived-qhgn",
        month: "january",
        qHht: 1026.72,
        internalGains: 120,
        solarGains: 180,
        etaHgn: 0.8,
        source: { reference: "P2V.derived_qhgn" }
      }
    ]
  });
  close(directQHgn.caseResults[0].qHnd, derivedQHgn.caseResults[0].qHnd);

  const c5 = calculateMc001ExplicitTotalHeatTransferSummary({
    mode: "explicit_total_heat_transfer_summary_v1",
    transmissionEnergy: q(1026.72, "kWh", "p2v.c5.tr", "explicit_calculated_input"),
    ventilationEnergy: q(0, "kWh", "p2v.c5.ve", "explicit_calculated_input")
  });
  const directQHht = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [fixedHeatingCase({ caseId: "direct-qhht" })]
  });
  const c5QHht = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "c5-qhht",
        month: "january",
        explicitTotalHeatTransferResult: c5,
        qHgn: 300,
        etaHgn: 0.8,
        source: { reference: "P2V.c5_qhht" }
      }
    ]
  });
  close(directQHht.caseResults[0].qHnd, c5QHht.caseResults[0].qHnd);

  const explicitAH = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "explicit-ah",
        month: "january",
        qHht: 1026.72,
        qHgn: 300,
        aH: 2,
        source: { reference: "P2V.explicit_ah" }
      }
    ]
  });
  const derivedEquivalentAH = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "derived-equivalent-ah",
        month: "january",
        qHht: 1026.72,
        qHgn: 300,
        utilizationDependencies: {
          effectiveInternalHeatCapacityJPerK: 5400000,
          totalHeatTransferCoefficientWK: 100,
          aH0: 1,
          tauH0: 15
        },
        source: { reference: "P2V.derived_equivalent_ah" }
      }
    ]
  });
  close(explicitAH.caseResults[0].aH, derivedEquivalentAH.caseResults[0].aH);
  close(explicitAH.caseResults[0].qHnd, derivedEquivalentAH.caseResults[0].qHnd);
});

await test("Building DNA assisted advanced adapter and override paths preserve equivalent outputs", () => {
  const assisted = createBuildingDnaFromAssistedAnswers(assistedAnswers()).buildingDna;
  const advancedResult = createBuildingDnaFromAdvancedModel({
    source: { reference: "P2V.advanced_equivalent" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    building: {
      buildingId: "p2v-advanced-equivalent",
      buildingType: "detached_house",
      constructionPeriod: "1978_1990",
      structuralSystem: "masonry"
    }
  });
  assert.equal(advancedResult.status, "ready");

  const assistedCalc = calculateChapter2ForBuildingDna(assisted);
  const advancedCalc = calculateChapter2ForBuildingDna(advancedResult.buildingDna);
  close(assistedCalc.chapter2Result.result.annualQHnd, advancedCalc.chapter2Result.result.annualQHnd);
  close(assistedCalc.chapter2Result.result.annualQCnd, advancedCalc.chapter2Result.result.annualQCnd);

  const assemblyInput = buildEnvelopeAssemblyPhysicsInput(assisted);
  const assemblyResultDirect = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput);
  const envelopeInput = buildEnvelopeTransmissionPhysicsInput(assisted, assemblyResultDirect);
  const envelopeResultDirect = calculateMc001EnvelopeTransmissionCoefficientExplicit(envelopeInput);
  const chapter2Input = buildChapter2UsefulDemandPhysicsInput(assisted, envelopeResultDirect);
  close(
    assistedCalc.chapter2Result.result.annualQHnd,
    assistedCalc.chapter2Result.result.heatingResult.summary.annualQHnd
  );
  close(
    assistedCalc.chapter2Input.monthlyCases.length,
    chapter2Input.monthlyCases.length
  );
  close(
    assistedCalc.envelopeTransmissionResult.result.amount,
    envelopeResultDirect.result.amount
  );

  const overridden = applyBuildingDnaOverride(assisted, {
    kind: "assembly_layer_thickness",
    assemblyId: "wall_masonry_300_eps_100",
    layerId: "eps-insulation",
    thicknessM: 0.2,
    reason: "p2v_validation_eps_thickness_monotonicity",
    source: { reference: "P2V.override.eps_thickness" }
  });
  assert.equal(overridden.status, "ready");
  const overriddenCalc = calculateChapter2ForBuildingDna(overridden.buildingDna);
  assert.ok(
    overriddenCalc.envelopeTransmissionResult.result.amount <
      assistedCalc.envelopeTransmissionResult.result.amount
  );
  assert.ok(
    overriddenCalc.chapter2Result.result.annualQHnd <=
      assistedCalc.chapter2Result.result.annualQHnd
  );
  assert.equal(overridden.override.previousValue.amount, 0.1);
  assert.equal(overridden.override.newValue.amount, 0.2);
});

await test("technical report reads major values from engine output paths without recalculation", () => {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());
  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  const calculation = calculateChapter2ForBuildingDna(pipeline.buildingDna);
  assert.equal(workspace.status, "ready");
  assert.equal(calculation.status, "ready");

  close(workspace.resultSummary.annualQHnd, calculation.chapter2Result.result.annualQHnd);
  close(workspace.resultSummary.annualQCnd, calculation.chapter2Result.result.annualQCnd);
  close(workspace.envelope.htr.amount, calculation.envelopeTransmissionResult.result.amount);
  close(
    workspace.envelope.components.find(item => item.componentId === "Hd").amount,
    calculation.envelopeTransmissionResult.components.Hd.amount
  );
  close(
    workspace.envelope.components.find(item => item.componentId === "Hg").amount,
    calculation.envelopeTransmissionResult.components.Hg.amount
  );
  close(
    workspace.envelope.components.find(item => item.componentId === "Hu").amount,
    calculation.envelopeTransmissionResult.components.Hu.amount
  );
  close(
    workspace.envelope.components.find(item => item.componentId === "Ha").amount,
    calculation.envelopeTransmissionResult.components.Ha.amount
  );

  const januaryWorkspace = workspace.monthly.find(item => item.month === "january");
  const januaryEngine = calculation.chapter2Result.result.monthlyResults.find(
    item => item.month === "january"
  );
  const januaryHeating = calculation.chapter2Result.result.heatingResult.caseResults.find(
    item => item.month === "january"
  );
  const januaryCooling = calculation.chapter2Result.result.coolingResult.caseResults.find(
    item => item.month === "january"
  );
  close(januaryWorkspace.heatingTransmissionKwh, januaryEngine.transmission.heating.transmissionEnergy.amount);
  close(januaryWorkspace.heatingVentilationKwh, januaryEngine.ventilation.heating.ventilationEnergy.amount);
  close(januaryWorkspace.internalGainsKwh, januaryEngine.heatGains.internalGains);
  close(januaryWorkspace.solarGainsKwh, januaryEngine.heatGains.solarGains);
  close(januaryWorkspace.qHndKwh, januaryHeating.qHnd);
  close(januaryWorkspace.qCndKwh, januaryCooling.qCnd);

  const reportSource = readFileSync(
    new URL("../../building-platform/buildingTechnicalReport.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of ["calculateMc001", "Math.", "**", "readFile", "fetch(", ".pdf"]) {
    assert.equal(reportSource.includes(forbidden), false, forbidden);
  }

  assert.ok(workspace.formulaViews.length > 0);
  assert.ok(workspace.traceability.length > 0);
  assert.equal(
    workspace.formulaViews.some(view =>
      view.formulaId === "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"
    ),
    true
  );
});

await test("demo fixture safety and synthetic climate-profile sanity are enforced", () => {
  const demo = getAssistedWizardDemoFixture();
  assert.equal(demo.fixtureId, ASSISTED_WIZARD_DEMO_FIXTURE.fixtureId);
  assert.equal(demo.provenance.origin, P2V_DEMO_FIXTURE_SAFETY_METADATA.origin);
  assert.equal(demo.provenance.confirmationStatus, "unconfirmed_demo");
  assert.equal(demo.provenance.editable, true);
  assert.equal(P2V_DEMO_FIXTURE_SAFETY_METADATA.notAClimateFile, true);
  assert.deepEqual(
    P2V_DEMO_FIXTURE_SAFETY_METADATA.artificialCoolingTriggerMonths,
    []
  );

  const demoPreview = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData(demo.values))
  );
  assert.equal(demoPreview.status, "ready");
  assert.equal(demoPreview.buildingDna.source.origin, "demo_fixture");
  assert.equal(demoPreview.buildingDna.demoFixture.confirmationStatus, "unconfirmed_demo");
  assert.equal(
    demoPreview.buildingDna.assumptions.some(item =>
      item.assumptionId === "demo_fixture_values_are_unconfirmed_and_editable"
    ),
    true
  );

  const normalAnswers = mapWizardAnswersToAssistedAnswers(formData({
    building_type: "house",
    construction_year: "",
    wall_material: "",
    wall_insulation: "",
    window_type: "",
    roof_type: "",
    floor_type: ""
  }));
  assert.equal(normalAnswers.source.origin, undefined);
  assert.equal(normalAnswers.buildingSpecificParameters.usefulFloorAreaM2, undefined);

  const profile = P2V_SYNTHETIC_SEASONAL_PROFILE;
  assert.equal(profile.status, "synthetic_validation_data");
  assert.equal(profile.monthlyOutdoorTemperaturesC.january < profile.monthlyOutdoorTemperaturesC.july, true);
  assert.equal(profile.monthlySolarGainsKwh.july > profile.monthlySolarGainsKwh.january, true);
  const htr = 50;
  const winterHeating = htr * (20 - profile.monthlyOutdoorTemperaturesC.january) *
    profile.monthlyDurationsH.january / 1000;
  const summerHeating = Math.max(
    0,
    htr * (20 - profile.monthlyOutdoorTemperaturesC.july) *
      profile.monthlyDurationsH.july / 1000
  );
  assert.ok(winterHeating > summerHeating);
});

await test("deterministic failure diagnostics catch invalid validation inputs", () => {
  const missingThickness = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "bad-assembly",
        assemblyType: "wall",
        source: source("bad.source"),
        layers: [
          {
            layerId: "bad-layer",
            material: directMaterial("bad", 0.5)
          }
        ],
        surfaceResistances: {
          rsi: q(0.13, "m2*K/W", "bad.rsi"),
          rse: q(0.04, "m2*K/W", "bad.rse")
        }
      }
    ]
  });
  assert.equal(missingThickness.status, "blocked");
  assert.equal(blockerCode(missingThickness), "invalid_explicit_layer_thickness");

  const invalidBoundary = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      element({ elementId: "bad-boundary", boundaryType: "unsupported", area: 10, uValue: 0.5 })
    ],
    noThermalBridges: true
  });
  assert.equal(invalidBoundary.status, "blocked");
  assert.equal(blockerCode(invalidBoundary), "unsupported_envelope_boundary_type");

  const duplicateCoolingMonth = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "dup",
        month: "july",
        qCht: 300,
        qCgn: 600,
        etaCht: 0.5,
        aCred: 1,
        source: { reference: "P2V.dup.1" }
      },
      {
        caseId: "dup",
        month: "august",
        qCht: 300,
        qCgn: 600,
        etaCht: 0.5,
        aCred: 1,
        source: { reference: "P2V.dup.2" }
      }
    ]
  });
  assert.equal(duplicateCoolingMonth.status, "blocked");
  assert.equal(blockerCode(duplicateCoolingMonth), "duplicate_monthly_cooling_case_identifier");

  const conflictingHeating = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "conflict",
        month: "january",
        qHht: 1000,
        qHgn: 300,
        internalGains: 120,
        solarGains: 180,
        etaHgn: 0.8,
        source: { reference: "P2V.conflict" }
      }
    ]
  });
  assert.equal(conflictingHeating.status, "blocked");
  assert.equal(blockerCode(conflictingHeating), "ambiguous_QHgn_source");

  const invalidOverride = applyBuildingDnaOverride(
    createBuildingDnaFromAssistedAnswers(assistedAnswers()).buildingDna,
    {
      kind: "assembly_layer_thickness",
      assemblyId: "wall_masonry_300_eps_100",
      layerId: "eps-insulation",
      thicknessM: -0.1,
      reason: "bad"
    }
  );
  assert.equal(invalidOverride.status, "blocked");
  assert.equal(invalidOverride.code, "invalid_building_dna_override");
});

await test("P2V validation gate exposes summary counts for the standard physics suite", () => {
  const summary = summarizeP2VValidationMatrix();
  const fixedExpectedValueCount = P2V_VALIDATION_SCENARIOS.reduce(
    (sum, entry) => sum + Object.keys(entry.expectedFinalValues).length,
    0
  );
  const diagnosticScenarioCount = P2V_VALIDATION_SCENARIOS.filter(
    entry => entry.expectedDiagnostics.length > 0
  ).length;

  assert.equal(summary.status, "P2V_VALIDATION_COMPLETE");
  assert.ok(summary.scenarioCount >= 20);
  assert.ok(P2V_INDEPENDENT_REFERENCE_BUILDINGS.length >= 5);
  assert.ok(fixedExpectedValueCount >= 20);
  assert.ok(summary.relationCount >= 15);
  assert.ok(summary.branchCount >= 2);
  assert.ok(diagnosticScenarioCount >= 0);
  console.log(
    `P2V gate summary: scenarios=${summary.scenarioCount} referenceBuildings=${P2V_INDEPENDENT_REFERENCE_BUILDINGS.length} fixedExpectedValues=${fixedExpectedValueCount} relations=${summary.relationCount} tables=${summary.tableCount}`
  );
});
