import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001CoolingUsefulDemandExplicit } from "../mc001CoolingUsefulDemandCalculation.mjs";
import {
  calculateMc001EnvelopeAssemblyUValueExplicit,
  calculateMc001EnvelopeTransmissionCoefficientExplicit
} from "../mc001EnvelopePhysicsCalculation.mjs";
import { calculateMc001ExplicitTotalHeatTransferSummary } from "../mc001ExplicitTotalHeatTransferCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "../mc001MonthlyHeatGainsCalculation.mjs";
import { calculateMc001MonthlyTransmissionEnergyExplicit } from "../mc001MonthlyTransmissionEnergyCalculation.mjs";
import { calculateMc001RestrictedHeatingQhndExplicit } from "../mc001RestrictedHeatingQhndCalculation.mjs";
import { calculateMc001MonthlyVentilationTransferExplicit } from "../mc001VentilationTransferCalculation.mjs";

const EPSILON = 1e-9;
const SOURCE = { sourceType: "explicit_user_input", reference: "manual_envelope_input" };
const CALCULATED_SOURCE = {
  sourceType: "explicit_calculated_input",
  reference: "mc001_envelope_physics_test"
};
const EXTERNAL_MATERIAL_SOURCE = {
  sourceType: "external_normative_material_catalog",
  reference: "SR_EN_ISO_10456.material_lambda.test_row"
};
const EXTERNAL_AIR_LAYER_SOURCE = {
  sourceType: "external_normative_air_layer_resistance",
  reference: "SR_EN_ISO_6946.air_layer.test_row"
};

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

function correctedMaterial(materialId, lambdaNormat, correctionCoefficientA, name = materialId) {
  return {
    materialId,
    name,
    lambdaNormat: value(lambdaNormat, "W/(m*K)"),
    correctionCoefficientA: value(correctionCoefficientA, "dimensionless", {
      sourceType: "mc001_table_2_2",
      reference: "MC001-2022.table_2_2"
    })
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

function externalCatalogMaterial(materialId, lambdaNormat, correctionCoefficientCode, name = materialId) {
  return {
    materialId,
    name,
    lambdaNormatCatalog: {
      contractCode: "SR_EN_ISO_10456_MATERIAL_LAMBDA_PROPERTIES",
      materialId,
      lambdaNormat: value(lambdaNormat, "W/(m*K)", EXTERNAL_MATERIAL_SOURCE)
    },
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
          layer("brick", 0.3, correctedMaterial("brick", 0.6, 1.03, "brick masonry")),
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
        boundaryCorrectionFactor: value(0.7, "dimensionless"),
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

function monthlyTransmission(result, { indoor, outdoor, mode = "heating" }) {
  return calculateMc001MonthlyTransmissionEnergyExplicit({
    mode: "explicit_monthly_transmission_energy_v1",
    cases: [
      {
        caseId: `${mode}-transmission`,
        month: mode === "cooling" ? "july" : "january",
        calculationMode: mode,
        htr: result.monthlyTransmissionInput.htr,
        indoorTemperature: value(indoor, "degC"),
        outdoorTemperature: value(outdoor, "degC"),
        duration: value(744, "h"),
        source: SOURCE
      }
    ]
  });
}

function ventilationTransfer({ indoor, outdoor, mode = "heating" }) {
  const hve = 300 * 1000 / (20 * 744);
  return calculateMc001MonthlyVentilationTransferExplicit({
    mode: "explicit_monthly_ventilation_transfer_v1",
    cases: [
      {
        caseId: `${mode}-ventilation`,
        month: mode === "cooling" ? "july" : "january",
        calculationMode: mode,
        airHeatCapacity: value(1200, "J/(m3*K)"),
        components: [
          {
            componentId: "explicit-airflow",
            airFlowRate: value(hve / 1200, "m3/s"),
            temperatureCorrectionFactor: value(1, "dimensionless"),
            dynamicCorrectionFactor: value(1, "dimensionless"),
            source: SOURCE
          }
        ],
        indoorTemperature: value(indoor, "degC"),
        outdoorTemperature: value(outdoor, "degC"),
        duration: value(744, "h"),
        source: SOURCE
      }
    ]
  });
}

function heatGainsResult() {
  return calculateMc001MonthlyHeatGainsExplicit({
    mode: "monthly_heat_gains_explicit_v1",
    cases: [
      {
        caseId: "jan-heat-gains",
        month: "january",
        internalGains: 120,
        solarGains: 180,
        source: { reference: "manual_envelope_input" }
      }
    ]
  });
}

function c5TotalTransfer(transmission, ventilation) {
  return calculateMc001ExplicitTotalHeatTransferSummary({
    mode: "explicit_total_heat_transfer_summary_v1",
    transmissionEnergy: {
      amount: transmission.caseResults[0].transmissionEnergy.amount,
      unit: "kWh",
      source: CALCULATED_SOURCE
    },
    ventilationEnergy: {
      amount: ventilation.caseResults[0].ventilationEnergy.amount,
      unit: "kWh",
      source: CALCULATED_SOURCE
    }
  });
}

function utilizationDependencies(transmissionResult, ventilationResult, overrides = {}) {
  return {
    effectiveInternalHeatCapacityJPerK: 25200000,
    heatTransferCoefficientComponents: {
      transmissionCoefficientWK: transmissionResult.result.amount,
      groundAdjacentCoefficientWK: 0,
      ventilationCoefficientWK:
        ventilationResult.caseResults[0].ventilationHeatTransferCoefficient.amount
    },
    aH0: 1,
    tauH0: 15,
    aC0: 1,
    tauC0: 15,
    ...overrides
  };
}

function assertBlocked(result, code) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
  if (code) {
    assert.equal(result.diagnostics.blockers[0].code, code);
  }
}

await test("assembly engine calculates lambda correction resistance and U-values", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "envelope_assembly_u_value_explicit_input_only_not_certificate");
  assert.equal(result.summary.assemblyCount, 6);
  const wall = assemblyById(result, "wall-brick-insulated");
  close(wall.layers[0].lambdaWmK, 0.618);
  close(wall.layers[0].resistanceM2KPerW, 0.48543689320388345);
  close(wall.totalResistance, 3.155436893203883);
  close(wall.uValue, 0.3169133257438233);
  assert.equal(wall.uValueOrigin, "calculated_from_explicit_layers_and_surfaces");
  assert.equal(wall.layers[0].lambdaOrigin, "calculated_from_MC001_relation_2_3_explicit_coefficient");
  assert.equal(
    result.diagnostics.methodologyLimits.includes("no_default_material_lambda"),
    true
  );
});

await test("surface coefficients can explicitly derive surface resistances", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "coefficient-wall",
        assemblyType: "wall",
        layers: [layer("single", 0.2, material("test-material", 0.5))],
        surfaceCoefficients: {
          hi: value(10, "W/(m2*K)"),
          he: value(25, "W/(m2*K)")
        },
        source: SOURCE
      }
    ]
  });

  assert.equal(result.status, "ready");
  const wall = result.assemblyResults[0];
  close(wall.rsi, 0.1);
  close(wall.rse, 0.04);
  close(wall.uValue, 1 / 0.54);
  assert.equal(wall.surfaceResistanceOrigin, "calculated_from_explicit_surface_coefficients");
});

await test("Table 2.2 correction coefficient ids can explicitly derive corrected lambda", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "table-coeff-wall",
        assemblyType: "wall",
        layers: [
          layer(
            "bca",
            0.24,
            tableCorrectedMaterial(
              "bca",
              0.24,
              "zidarie_bca_betoane_usoare_placi_bca_uscata_vechime_ge_20_ani"
            )
          )
        ],
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      }
    ]
  });

  assert.equal(result.status, "ready");
  const wall = result.assemblyResults[0];
  close(wall.layers[0].correctionCoefficientA, 1.05);
  close(wall.layers[0].lambdaWmK, 0.252);
  close(wall.layers[0].resistanceM2KPerW, 0.9523809523809523);
  assert.equal(
    wall.layers[0].correctionCoefficientCode,
    "zidarie_bca_betoane_usoare_placi_bca_uscata_vechime_ge_20_ani"
  );
  assert.equal(wall.layers[0].correctionCoefficientSource, "MC001-2022 Tabel 2.2");
  assert.equal(wall.layers[0].correctionCoefficientMetadata.materialCategoryRo.includes("BCA"), true);
});

await test("external material lambda contract can feed Table 2.2 correction and layer resistance", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "external-material-catalog-wall",
        assemblyType: "wall",
        layers: [
          layer(
            "brick-catalog",
            0.3,
            externalCatalogMaterial(
              "brick-catalog",
              0.8,
              "zidarie_caramida_condens_vechime_ge_30_ani",
              "zidarie caramida plina"
            )
          )
        ],
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      }
    ]
  });

  assert.equal(result.status, "ready");
  const wall = result.assemblyResults[0];
  close(wall.layers[0].lambdaWmK, 0.92);
  close(wall.layers[0].resistanceM2KPerW, 0.32608695652173914);
  close(wall.totalResistance, 0.4960869565217392);
  close(wall.uValue, 2.0157756354075373);
  assert.equal(
    wall.layers[0].lambdaOrigin,
    "calculated_from_external_material_lambda_contract_and_MC001_relation_2_3"
  );
  assert.equal(
    wall.layers[0].lambdaNormatSourceContractCode,
    "SR_EN_ISO_10456_MATERIAL_LAMBDA_PROPERTIES"
  );
  assert.equal(wall.layers[0].correctionCoefficientCode, "zidarie_caramida_condens_vechime_ge_30_ani");
});

await test("external SR EN ISO 6946 air-layer contract can feed total resistance", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "air-layer-contract-wall",
        assemblyType: "wall",
        layers: [layer("single", 0.2, material("test-material", 0.5))],
        airLayers: [
          {
            airLayerId: "unventilated-air-gap",
            resistanceCatalog: {
              contractCode: "SR_EN_ISO_6946_UNVENTILATED_AIR_LAYER_RESISTANCE",
              resistance: value(0.18, "m2*K/W", EXTERNAL_AIR_LAYER_SOURCE)
            }
          }
        ],
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      }
    ]
  });

  assert.equal(result.status, "ready");
  const wall = result.assemblyResults[0];
  close(wall.totalResistance, 0.75);
  close(wall.uValue, 1.3333333333333333);
  assert.equal(wall.airLayers[0].origin, "external_SR_EN_ISO_6946_air_layer_resistance_contract");
  assert.equal(
    wall.airLayers[0].sourceContractCode,
    "SR_EN_ISO_6946_UNVENTILATED_AIR_LAYER_RESISTANCE"
  );
});

await test("external material and air-layer contract paths reject ambiguity and unknown contracts", () => {
  const ambiguousMaterial = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "ambiguous-material-contract",
        assemblyType: "wall",
        layers: [
          layer("single", 0.2, {
            ...externalCatalogMaterial(
              "ambiguous-material",
              0.8,
              "zidarie_caramida_uscata_vechime_ge_30_ani"
            ),
            lambdaNormat: value(0.8, "W/(m*K)")
          })
        ],
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      }
    ]
  });
  assertBlocked(ambiguousMaterial, "ambiguous_material_lambda_source");

  const unknownMaterialContract = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "unknown-material-contract",
        assemblyType: "wall",
        layers: [
          layer("single", 0.2, {
            materialId: "unknown-contract-material",
            lambdaNormatCatalog: {
              contractCode: "UNKNOWN_MATERIAL_CONTRACT",
              lambdaNormat: value(0.8, "W/(m*K)", EXTERNAL_MATERIAL_SOURCE)
            },
            correctionCoefficientCode: "zidarie_caramida_uscata_vechime_ge_30_ani"
          })
        ],
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      }
    ]
  });
  assertBlocked(unknownMaterialContract, "unknown_material_lambda_source_contract");

  const ambiguousAirLayer = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "ambiguous-air-layer-contract",
        assemblyType: "wall",
        layers: [layer("single", 0.2, material("test-material", 0.5))],
        airLayers: [
          {
            airLayerId: "air-gap",
            resistance: value(0.1, "m2*K/W"),
            resistanceCatalog: {
              contractCode: "SR_EN_ISO_6946_UNVENTILATED_AIR_LAYER_RESISTANCE",
              resistance: value(0.18, "m2*K/W", EXTERNAL_AIR_LAYER_SOURCE)
            }
          }
        ],
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      }
    ]
  });
  assertBlocked(ambiguousAirLayer, "ambiguous_air_layer_resistance_source");
});

await test("Table 2.11 surface resistance code can explicitly derive Rsi and Rse", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "table-2-11-wall",
        assemblyType: "wall",
        layers: [layer("single", 0.2, material("test-material", 0.5))],
        surfaceResistanceTable2_11Code: "ventilated_unheated_downward_heat_flow",
        source: SOURCE
      }
    ]
  });

  assert.equal(result.status, "ready");
  const wall = result.assemblyResults[0];
  close(wall.rsi, 0.167);
  close(wall.rse, 0.084);
  close(wall.uValue, 1 / (0.167 + 0.4 + 0.084));
  assert.equal(
    wall.surfaceResistanceOrigin,
    "calculated_from_MC001_table_2_11_surface_resistance_code"
  );
  assert.equal(wall.surfaceResistanceSourceCode, "ventilated_unheated_downward_heat_flow");
  assert.equal(wall.surfaceResistanceSourceTable, "MC001-2022 Tabel 2.11");
  assert.equal(wall.surfaceResistanceMetadata.hiWPerM2K, 6);
  assert.equal(wall.surfaceResistanceMetadata.heWPerM2K, 12);
});

await test("Table 2.12 exterior Rse code can combine with explicit Rsi", () => {
  const result = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "table-2-12-wall",
        assemblyType: "wall",
        layers: [layer("single", 0.2, material("test-material", 0.5))],
        surfaceResistances: {
          rsi: value(0.125, "m2*K/W")
        },
        exteriorSurfaceResistanceTable2_12Code: "wind_5_m_per_s",
        source: SOURCE
      }
    ]
  });

  assert.equal(result.status, "ready");
  const wall = result.assemblyResults[0];
  close(wall.rsi, 0.125);
  close(wall.rse, 0.04);
  close(wall.uValue, 1 / (0.125 + 0.4 + 0.04));
  assert.equal(wall.surfaceResistanceOrigin, "explicit_rsi_with_MC001_table_2_12_exterior_rse_code");
  assert.equal(wall.surfaceResistanceSourceCode, "wind_5_m_per_s");
  assert.equal(wall.surfaceResistanceSourceTable, "MC001-2022 Tabel 2.12");
  assert.equal(wall.surfaceResistanceMetadata.windSpeedMPerS, 5);
});

await test("surface resistance table paths reject ambiguous and unknown codes", () => {
  const ambiguous = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "ambiguous-surface-table",
        assemblyType: "wall",
        layers: [layer("single", 0.2, material("test-material", 0.5))],
        surfaceResistanceTable2_11Code: "outside_horizontal_heat_flow",
        surfaceResistances: {
          rsi: value(0.13, "m2*K/W"),
          rse: value(0.04, "m2*K/W")
        },
        source: SOURCE
      }
    ]
  });
  assertBlocked(ambiguous, "ambiguous_surface_resistance_source");

  const unknown = calculateMc001EnvelopeAssemblyUValueExplicit({
    mode: "envelope_assembly_u_value_explicit_v1",
    assemblies: [
      {
        assemblyId: "unknown-surface-table",
        assemblyType: "wall",
        layers: [layer("single", 0.2, material("test-material", 0.5))],
        surfaceResistanceTable2_11Code: "unknown_surface_code",
        source: SOURCE
      }
    ]
  });
  assertBlocked(unknown, "unknown_table_2_11_surface_resistance_code");
});

await test("envelope transmission engine derives Hd Hg Hu Ha and Htr", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const result = envelopeTransmissionResult(assemblies);

  assert.equal(result.status, "ready");
  close(result.components.Hd.amount, 40.871819482282156);
  close(result.components.Hg.amount, 13.154500902759864);
  close(result.components.Hu.amount, 9.230769230769228);
  close(result.components.Ha.amount, 1);
  close(result.result.amount, 64.25708961581125);
  assert.equal(result.result.origin, "calculated_from_explicit_envelope_assemblies_and_boundaries");
  assert.equal(result.elementResults.find(item => item.elementId === "ground-floor").boundaryCorrectionOrigin, "explicit_Hg_boundary_correction_factor");
  assert.equal(result.thermalBridgeResults[0].contributionFormulaCode, "MC001_2_11_LINEAR_THERMAL_BRIDGE_TERM");
});

await test("unheated boundary correction can be derived from explicit relation 2.22 heat-transfer ratio", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      {
        elementId: "attic-with-bztu-ratio",
        elementType: "ceiling",
        boundaryType: "unheated_attic",
        assemblyResult: assemblyById(assemblies, "wood-earth-ceiling"),
        area: value(40, "m2"),
        boundaryCorrection: {
          mode: "bztu_explicit_heat_transfer_ratio_v1",
          heatTransferToExterior: value(30, "W/K"),
          totalHeatTransfer: value(50, "W/K")
        },
        source: SOURCE
      }
    ],
    noThermalBridges: true
  });

  assert.equal(result.status, "ready");
  const attic = result.elementResults[0];
  close(attic.boundaryCorrectionFactor, 0.6);
  close(attic.contributionWK, 7.91208791208791);
  assert.equal(
    attic.boundaryCorrectionOrigin,
    "calculated_from_MC001_2_22_explicit_bztu_heat_transfer_ratio"
  );
  assert.equal(attic.boundaryCorrectionFormulaCode, "MC001_2_22_BZTU_CORRECTION_FACTOR");
  assert.equal(attic.boundaryCorrectionSourceScope, "bztu_explicit_heat_transfer_ratio_v1");
});

await test("unheated boundary correction can derive bztu from explicit relations 2.23 and 2.24 balance", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      {
        elementId: "attic-with-bztu-balance",
        elementType: "ceiling",
        boundaryType: "unheated_attic",
        assemblyResult: assemblyById(assemblies, "wood-earth-ceiling"),
        area: value(40, "m2"),
        boundaryCorrection: {
          mode: "bztu_explicit_ztu_balance_v1",
          heatTransferToExteriorEnvelope: value(20, "W/K"),
          exteriorVentilationCoefficient: value(0.5, "dimensionless"),
          conditionedZoneHeatTransfers: [
            value(20, "W/K"),
            value(30, "W/K")
          ]
        },
        source: SOURCE
      }
    ],
    noThermalBridges: true
  });

  assert.equal(result.status, "ready");
  const attic = result.elementResults[0];
  close(attic.boundaryCorrectionHztuExteriorWK, 30);
  close(attic.boundaryCorrectionHztuTotalWK, 80);
  close(attic.boundaryCorrectionFactor, 0.375);
  close(attic.contributionWK, 4.945054945054944);
  assert.equal(
    attic.boundaryCorrectionOrigin,
    "calculated_from_MC001_2_22_2_23_2_24_explicit_ztu_balance"
  );
  assert.equal(
    attic.boundaryCorrectionFormulaCode,
    "MC001_2_22_2_23_2_24_BZTU_EXPLICIT_BALANCE"
  );
  assert.equal(attic.boundaryCorrectionSourceScope, "bztu_explicit_ztu_balance_v1");
  assert.equal(attic.boundaryCorrectionExteriorVentilationCoefficient, 0.5);
  assert.equal(attic.boundaryCorrectionConditionedZoneHeatTransferSumWK, 50);
});

await test("explicit bztu balance requires conditioned-zone transfer inputs", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      {
        elementId: "attic-missing-conditioned-transfers",
        elementType: "ceiling",
        boundaryType: "unheated_attic",
        assemblyResult: assemblyById(assemblies, "wood-earth-ceiling"),
        area: value(40, "m2"),
        boundaryCorrection: {
          mode: "bztu_explicit_ztu_balance_v1",
          heatTransferToExteriorEnvelope: value(20, "W/K"),
          exteriorVentilationCoefficient: value(0.5, "dimensionless")
        },
        source: SOURCE
      }
    ],
    noThermalBridges: true
  });

  assertBlocked(result, "missing_explicit_bztu_conditioned_zone_heat_transfers");
});

await test("relation 2.22 boundary correction does not replace ground-contact factors", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      {
        elementId: "ground-with-bztu-ratio",
        elementType: "floor",
        boundaryType: "ground",
        assemblyResult: assemblyById(assemblies, "ground-floor-slab"),
        area: value(40, "m2"),
        boundaryCorrection: {
          mode: "bztu_explicit_heat_transfer_ratio_v1",
          heatTransferToExterior: value(30, "W/K"),
          totalHeatTransfer: value(50, "W/K")
        },
        source: SOURCE
      }
    ],
    noThermalBridges: true
  });

  assertBlocked(result, "unsupported_bztu_boundary_correction_context");
});

await test("relations 2.23 and 2.24 boundary correction do not replace ground-contact factors", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      {
        elementId: "ground-with-bztu-balance",
        elementType: "floor",
        boundaryType: "ground",
        assemblyResult: assemblyById(assemblies, "ground-floor-slab"),
        area: value(40, "m2"),
        boundaryCorrection: {
          mode: "bztu_explicit_ztu_balance_v1",
          heatTransferToExteriorEnvelope: value(20, "W/K"),
          exteriorVentilationCoefficient: value(0.5, "dimensionless"),
          conditionedZoneHeatTransfers: [value(20, "W/K")]
        },
        source: SOURCE
      }
    ],
    noThermalBridges: true
  });

  assertBlocked(result, "unsupported_bztu_boundary_correction_context");
});

await test("small house golden fixture feeds derived Htr through C5 QHnd and QCnd", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const envelope = envelopeTransmissionResult(assemblies);
  const heatingTransmission = monthlyTransmission(envelope, { indoor: 20, outdoor: 0 });
  const heatingVentilation = ventilationTransfer({ indoor: 20, outdoor: 0 });
  const totalTransfer = c5TotalTransfer(heatingTransmission, heatingVentilation);
  const gains = heatGainsResult();
  const dependencies = utilizationDependencies(envelope, heatingVentilation);

  assert.equal(heatingTransmission.status, "ready");
  close(heatingTransmission.caseResults[0].transmissionEnergy.amount, 956.1454934832715);
  assert.equal(heatingVentilation.status, "ready");
  close(heatingVentilation.caseResults[0].ventilationEnergy.amount, 300);
  assert.equal(totalTransfer.status, "ready");
  close(totalTransfer.result.amount, 1256.1454934832714);
  assert.equal(gains.status, "ready");
  close(gains.caseResults[0].qHgn, 300);

  const qhnd = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "jan-envelope-qhnd",
        month: "january",
        explicitTotalHeatTransferResult: totalTransfer,
        monthlyHeatGainsResult: gains,
        utilizationDependencies: {
          effectiveInternalHeatCapacityJPerK: dependencies.effectiveInternalHeatCapacityJPerK,
          heatTransferCoefficientComponents: dependencies.heatTransferCoefficientComponents,
          aH0: dependencies.aH0,
          tauH0: dependencies.tauH0
        },
        source: {
          reference: "manual_envelope_input"
        }
      }
    ]
  });
  assert.equal(qhnd.status, "ready");
  close(qhnd.caseResults[0].qHht, 1256.1454934832714);
  close(qhnd.caseResults[0].tauH, 82.92033091737326);
  close(qhnd.caseResults[0].aH, 6.528022061158217);
  close(qhnd.caseResults[0].etaHgn, 0.9999336876916943);
  close(qhnd.caseResults[0].qHnd, 956.165387175763);
  assert.equal(qhnd.caseResults[0].qHhtOrigin, "calculated_from_explicit_C5_transfer");
  assert.equal(qhnd.caseResults[0].qHgnOrigin, "calculated_from_explicit_monthly_heat_gains_result");
  assert.equal(qhnd.caseResults[0].tauHOrigin, "calculated_from_explicit_heat_transfer_coefficient_components");
  assert.equal(qhnd.caseResults[0].aHOrigin, "calculated_from_explicit_tauH_dependencies");
  assert.equal(qhnd.caseResults[0].etaHgnOrigin, "calculated_from_explicit_time_constant_dependencies");
  assert.equal(qhnd.diagnostics.methodologyLimits.includes("not_certificate"), true);

  const coolingTransmission = monthlyTransmission(envelope, {
    indoor: 20,
    outdoor: 25,
    mode: "cooling"
  });
  assert.equal(coolingTransmission.status, "ready");
  const qCht = coolingTransmission.summary.annualCoolingDirectionTransmissionEnergy.amount;
  close(qCht, 239.03637337081787);
  const qcnd = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "jul-envelope-qcnd",
        month: "july",
        qCht,
        qCgn: 600,
        aCred: 1,
        utilizationDependencies: {
          effectiveInternalHeatCapacityJPerK: dependencies.effectiveInternalHeatCapacityJPerK,
          heatTransferCoefficientComponents: dependencies.heatTransferCoefficientComponents,
          aC0: dependencies.aC0,
          tauC0: dependencies.tauC0
        },
        source: {
          reference: "manual_envelope_input"
        }
      }
    ]
  });
  assert.equal(qcnd.status, "ready");
  close(qcnd.caseResults[0].tauC, 82.92033091737326);
  close(qcnd.caseResults[0].aC, 6.528022061158217);
  close(qcnd.caseResults[0].etaCht, 0.9985189467167785);
  close(qcnd.caseResults[0].qCnd, 361.31765223477237);
  assert.equal(qcnd.caseResults[0].qChtOrigin, "explicit_input");
  assert.equal(qcnd.caseResults[0].etaChtOrigin, "calculated_from_explicit_time_constant_dependencies");
  assert.equal(qcnd.diagnostics.methodologyLimits.includes("not_certificate"), true);
});

await test("boundary contexts requiring corrections block without explicit factor", () => {
  const assemblies = calculateMc001EnvelopeAssemblyUValueExplicit(assemblyInput());
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    elements: [
      {
        elementId: "ground-without-factor",
        boundaryType: "ground",
        assemblyResult: assemblyById(assemblies, "ground-floor-slab"),
        area: value(10, "m2"),
        source: SOURCE
      }
    ],
    noThermalBridges: true
  });

  assertBlocked(result, "missing_explicit_boundary_correction_factor");
});

await test("client-supplied derived envelope fields are rejected", () => {
  const result = calculateMc001EnvelopeTransmissionCoefficientExplicit({
    mode: "envelope_transmission_coefficient_explicit_v1",
    result: { amount: 1, unit: "W/K" },
    elements: []
  });

  assertBlocked(result, "client_supplied_derived_envelope_transmission_field");
});

await test("envelope module has no runtime file network or document extraction access", () => {
  const source = readFileSync(
    new URL("../mc001EnvelopePhysicsCalculation.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "readFile",
    "XMLHttpRequest",
    "fet" + "ch(",
    "fit" + "z",
    "get_text",
    "runtime_document_extraction"
  ]) {
    assert.equal(source.includes(forbidden), false, `found ${forbidden}`);
  }
});
