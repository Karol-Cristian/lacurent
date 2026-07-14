import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateMc001EnvelopeAssemblyUValueExplicit,
  calculateMc001EnvelopeTransmissionCoefficientExplicit
} from "../mc001EnvelopePhysicsCalculation.mjs";
import { calculateMc001Chapter2UsefulDemandExplicit } from "../mc001Chapter2UsefulDemandCalculation.mjs";

const EPSILON = 1e-9;
const SOURCE = { sourceType: "explicit_user_input", reference: "chapter_2_golden_input" };
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];

function close(actual, expected, tolerance = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function value(amount, unit, source = SOURCE) {
  return { amount, unit, source };
}

function material(materialId, lambda, name = materialId) {
  return {
    materialId,
    name,
    lambda: value(lambda, "W/(m*K)")
  };
}

function tableCorrectedMaterial(materialId, lambdaNormat, correctionCoefficientCode, name = materialId) {
  return {
    materialId,
    name,
    lambdaNormat: value(lambdaNormat, "W/(m*K)"),
    correctionCoefficientCode
  };
}

function layer(layerId, thickness, layerMaterial) {
  return {
    layerId,
    thickness: value(thickness, "m"),
    material: layerMaterial
  };
}

function assemblyInput() {
  return {
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "wall-brick-insulated",
        assemblyType: "wall",
        layers: [
          layer(
            "brick",
            0.3,
            tableCorrectedMaterial(
              "brick",
              0.6,
              "zidarie_caramida_uscata_vechime_ge_30_ani",
              "brick masonry"
            )
          ),
          layer("insulation", 0.1, material("mineral-wool", 0.04, "mineral wool"))
        ],
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      },
      {
        assemblyId: "roof-insulated",
        assemblyType: "roof",
        layers: [
          layer("timber", 0.02, material("timber", 0.18, "timber board")),
          layer("roof-insulation", 0.2, material("mineral-wool-roof", 0.04, "mineral wool"))
        ],
        surfaceResistances: {
          rsi: value(0.1, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      },
      {
        assemblyId: "ground-floor-slab",
        assemblyType: "floor",
        layers: [
          layer("concrete", 0.12, material("reinforced-concrete", 1.7, "reinforced concrete")),
          layer("floor-insulation", 0.08, material("eps-floor", 0.04, "floor insulation"))
        ],
        surfaceResistances: {
          rsi: value(0.17, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      },
      {
        assemblyId: "wood-earth-ceiling",
        assemblyType: "ceiling",
        layers: [
          layer("wood-plank", 0.03, material("wood-plank", 0.18, "wood plank")),
          layer("earth-fill", 0.15, material("earth-fill", 0.9, "earth fill")),
          layer("ceiling-insulation", 0.1, material("mineral-wool-ceiling", 0.04, "ceiling insulation"))
        ],
        surfaceResistances: {
          rsi: value(0.1, "m2*K/W"),
          rse: value(0.1, "m2*K/W")
        },
        source: SOURCE
      },
      {
        assemblyId: "window-explicit-u",
        assemblyType: "window",
        directUValue: value(1.2, "W/(m2*K)"),
        source: SOURCE
      },
      {
        assemblyId: "door-explicit-u",
        assemblyType: "door",
        directUValue: value(1.6, "W/(m2*K)"),
        source: SOURCE
      }
    ]
  };
}

function assemblyById(result, assemblyId) {
  return result.assemblyResults.find(assembly => assembly.assemblyId === assemblyId);
}

function envelopeTransmissionResult(assemblies) {
  return calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      {
        elementId: "exterior-walls",
        elementType: "wall",
        boundaryType: "outside_air",
        assemblyResult: assemblyById(assemblies, "wall-brick-insulated"),
        area: value(50, "m2"),
        source: SOURCE
      },
      {
        elementId: "roof",
        elementType: "roof",
        boundaryType: "outside_air",
        assemblyResult: assemblyById(assemblies, "roof-insulated"),
        area: value(60, "m2"),
        source: SOURCE
      },
      {
        elementId: "windows",
        elementType: "window",
        boundaryType: "outside_air",
        assemblyResult: assemblyById(assemblies, "window-explicit-u"),
        area: value(8, "m2"),
        source: SOURCE
      },
      {
        elementId: "front-door",
        elementType: "door",
        boundaryType: "outside_air",
        assemblyResult: assemblyById(assemblies, "door-explicit-u"),
        area: value(2, "m2"),
        source: SOURCE
      },
      {
        elementId: "ground-floor",
        elementType: "floor",
        boundaryType: "ground",
        assemblyResult: assemblyById(assemblies, "ground-floor-slab"),
        area: value(50, "m2"),
        boundaryCorrectionFactor: value(0.6, "dimensionless"),
        source: SOURCE
      },
      {
        elementId: "attic-ceiling",
        elementType: "ceiling",
        boundaryType: "unheated_attic",
        assemblyResult: assemblyById(assemblies, "wood-earth-ceiling"),
        area: value(40, "m2"),
        boundaryCorrection: {
          mode: "bztu_explicit_heat_transfer_ratio_v1",
          heatTransferToExterior: value(35, "W/K"),
          totalHeatTransfer: value(50, "W/K")
        },
        source: SOURCE
      },
      {
        elementId: "adjacent-wall",
        elementType: "wall",
        boundaryType: "adjacent_heated_space",
        uValue: value(0.5, "W/(m2*K)"),
        area: value(10, "m2"),
        boundaryCorrectionFactor: value(0.2, "dimensionless"),
        source: SOURCE
      }
    ],
    linearThermalBridges: [
      {
        bridgeId: "external-corners",
        component: "Hd",
        length: value(20, "m"),
        psi: value(0.04, "W/(m*K)"),
        source: SOURCE
      }
    ],
    pointThermalBridges: [],
    noThermalBridges: false
  });
}

function ventilationConfig(indoor, outdoor, duration = 720) {
  return {
    airHeatCapacity: value(1200, "J/(m3*K)"),
    components: [
      {
        componentId: "explicit-airflow",
        airFlowRate: value(20 / 1200, "m3/s"),
        temperatureCorrectionFactor: value(1, "dimensionless"),
        dynamicCorrectionFactor: value(1, "dimensionless"),
        source: SOURCE
      }
    ],
    indoorTemperature: value(indoor, "degC"),
    outdoorTemperature: value(outdoor, "degC"),
    duration: value(duration, "h")
  };
}

function transmissionConfig(indoor, outdoor, duration = 720) {
  return {
    indoorTemperature: value(indoor, "degC"),
    outdoorTemperature: value(outdoor, "degC"),
    duration: value(duration, "h")
  };
}

function utilizationDependencies() {
  return {
    effectiveInternalHeatCapacityJPerK: 25200000,
    deriveTotalHeatTransferCoefficientFromEnvelopeAndVentilation: true,
    aH0: 1,
    tauH0: 15,
    aC0: 1,
    tauC0: 15
  };
}

function heatingIntermittencyCorrection(htr) {
  return {
    thetaIntSetH: 20,
    thetaExternal: 0,
    transmissionHeatTransferCoefficientWK: htr,
    ventilationHeatTransferCoefficientWK: 20,
    calculationDurationHours: 720,
    tauH: 83,
    reductionPeriods: [
      {
        periodId: "day",
        thetaIntSetHLow: 20,
        reductionDurationHours: 0,
        repetitionCount: 0
      },
      {
        periodId: "night",
        thetaIntSetHLow: 16,
        reductionDurationHours: 8,
        repetitionCount: 7
      },
      {
        periodId: "wknd",
        thetaIntSetHLow: 20,
        reductionDurationHours: 0,
        repetitionCount: 0
      }
    ]
  };
}

function monthlyCases(htr) {
  return MONTHS.map((month, index) => {
    const base = {
      caseId: `chapter2-${month}`,
      month,
      source: { reference: "chapter_2_golden_input" },
      transmission: {
        heating: transmissionConfig(20, 0),
        cooling: transmissionConfig(24, 30)
      },
      ventilation: {
        heating: ventilationConfig(20, 0),
        cooling: ventilationConfig(24, 30)
      },
      heatGains: {
        internalGains: 120,
        solarGains: 180
      },
      heating: {
        utilizationDependencies: utilizationDependencies()
      },
      cooling: {
        utilizationDependencies: utilizationDependencies(),
        aCred: 1
      }
    };

    if (month === "february") {
      base.heating = {
        longUnoccupiedPeriodAdjustment: {
          qHndOccupied: 900,
          qHndUnoccupied: 300,
          unoccupiedFraction: 0.25
        }
      };
    }
    if (month === "march") {
      base.heating = {
        utilizationDependencies: utilizationDependencies(),
        heatingIntermittencyCorrection: heatingIntermittencyCorrection(htr)
      };
    }
    if (month === "july") {
      base.cooling = {
        longUnoccupiedPeriodAdjustment: {
          qCndOccupied: 500,
          qCndUnoccupied: 200,
          unoccupiedFraction: 0.4
        }
      };
    }
    if (month === "august") {
      base.cooling = {
        utilizationDependencies: utilizationDependencies(),
        coolingIntermittency: {
          weekendReductionDurationHours: 48,
          weekendReductionRepetitionCount: 1,
          bCredWknd: 0.5
        }
      };
    }
    if (month === "september") {
      base.heatGains = {
        internalGains: 1500,
        solarGains: 1500
      };
    }
    if (month === "october") {
      base.heating.gammaH = -0.1;
    }
    if (index % 2 === 1 && month !== "september") {
      base.heatGains = {
        internalGains: 100,
        solarGains: 160
      };
    }
    return base;
  });
}

function assertBlocked(result, code) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].code, code);
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
}

await test("Chapter 2 golden building calculates 12 explicit monthly QHnd and QCnd", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const envelope = envelopeTransmissionResult(assemblies);
  const result = calculateMc001Chapter2UsefulDemandExplicit({
    mode: "chapter_2_useful_demand_explicit_v1",
    envelopeTransmissionResult: envelope,
    monthlyCases: monthlyCases(envelope.result.amount)
  });

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "mc001_chapter_2_useful_demand_explicit_v1_not_certificate");
  close(assemblyById(assemblies, "wall-brick-insulated").layers[0].lambdaWmK, 0.618);
  close(assemblyById(assemblies, "wood-earth-ceiling").uValue, 0.3296703296703296);
  close(envelope.components.Hd.amount, 40.871819482282156);
  close(envelope.components.Hg.amount, 13.154500902759864);
  close(envelope.components.Hu.amount, 9.230769230769228);
  close(envelope.components.Ha.amount, 1);
  close(envelope.result.amount, 64.25708961581125);
  assert.equal(
    envelope.elementResults.find(item => item.elementId === "attic-ceiling").boundaryCorrectionOrigin,
    "calculated_from_MC001_2_22_explicit_bztu_heat_transfer_ratio"
  );

  const monthly = result.result.monthlyResults;
  assert.equal(monthly.length, 12);
  assert.equal(result.result.caseCount, 12);
  assert.equal(result.result.monthCount, 12);
  close(monthly[0].transmission.heating.transmissionEnergy.amount, 925.3020904676819);
  close(monthly[0].ventilation.heating.ventilationEnergy.amount, 288);
  close(monthly[0].heatGains.qHgn, 300);

  const heating = result.result.heatingResult;
  const cooling = result.result.coolingResult;
  assert.equal(heating.caseResults.length, 12);
  assert.equal(cooling.caseResults.length, 12);
  close(heating.caseResults.find(item => item.month === "january").qHnd, 913.3264036320874);
  close(heating.caseResults.find(item => item.month === "february").qHnd, 750);
  assert.equal(
    heating.caseResults.find(item => item.month === "march").qHhtOrigin,
    "calculated_from_explicit_heating_intermittency_correction"
  );
  close(heating.caseResults.find(item => item.month === "september").qHnd, 0);
  assert.equal(
    heating.caseResults.find(item => item.month === "september").qHndBranch,
    "gammaH_greater_than_two_zero_demand"
  );
  assert.equal(
    heating.caseResults.find(item => item.month === "october").qHndBranch,
    "gammaH_less_or_equal_zero_positive_gains_zero_demand"
  );
  assert.equal(
    heating.caseResults.find(item => item.month === "january").etaHgnOrigin,
    "calculated_from_explicit_time_constant_dependencies"
  );
  assert.equal(
    heating.caseResults.find(item => item.month === "january").qHhtOrigin,
    "calculated_from_explicit_C5_transfer"
  );
  assert.equal(
    heating.caseResults.find(item => item.month === "january").qHgnOrigin,
    "calculated_from_explicit_monthly_heat_gains_result"
  );

  close(cooling.caseResults.find(item => item.month === "january").qCnd, 19.4178736507414);
  close(cooling.caseResults.find(item => item.month === "july").qCnd, 380);
  assert.equal(
    cooling.caseResults.find(item => item.month === "august").aCredOrigin,
    "calculated_from_explicit_weekend_cooling_reduction"
  );
  assert.equal(
    cooling.caseResults.find(item => item.month === "july").qCndBranch,
    "long_unoccupied_period_explicit_interpolation"
  );

  close(result.result.annualQHnd, 9115.665451102092);
  close(result.result.annualQCnd, 3146.038436567196);
  close(result.result.combinedUsefulDemandResult.result.annualQHnd, result.result.annualQHnd);
  close(result.result.combinedUsefulDemandResult.result.annualQCnd, result.result.annualQCnd);
  assert.equal(Object.hasOwn(result.result.combinedUsefulDemandResult.result, "totalUsefulDemand"), false);
  assert.equal(
    result.result.coverageCompleteness.sourcePackCode,
    "MC001_R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK"
  );
  for (const limit of [
    "explicit_input_only",
    "no_hidden_defaults",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
});

await test("Chapter 2 orchestrator blocks incomplete or ambiguous monthly input", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const envelope = envelopeTransmissionResult(assemblies);
  assertBlocked(
    calculateMc001Chapter2UsefulDemandExplicit({
      mode: "chapter_2_useful_demand_explicit_v1",
      envelopeTransmissionResult: envelope,
      monthlyCases: monthlyCases(envelope.result.amount).slice(0, 11)
    }),
    "incomplete_chapter_2_monthly_set"
  );
  assertBlocked(
    calculateMc001Chapter2UsefulDemandExplicit({
      mode: "chapter_2_useful_demand_explicit_v1",
      envelopeTransmissionResult: envelope,
      monthlyCases: monthlyCases(envelope.result.amount).map((item, index) => (
        index === 1 ? { ...item, month: "january" } : item
      ))
    }),
    "duplicate_chapter_2_month"
  );
});

await test("Chapter 2 module has no runtime PDF filesystem network or certificate access", () => {
  const source = readFileSync(
    new URL("../mc001Chapter2UsefulDemandCalculation.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "readFile",
    "fetch(",
    "XMLHttpRequest",
    ".pdf",
    "get_text",
    "certificateResult",
    "primaryEnergyResult"
  ]) {
    assert.equal(source.includes(forbidden), false, `found ${forbidden}`);
  }
});
