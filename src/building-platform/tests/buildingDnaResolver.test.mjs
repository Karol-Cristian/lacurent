import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyBuildingDnaOverride,
  CLIMATE_RUNTIME_ELIGIBILITY_STATUSES,
  createBuildingDnaFromAdvancedModel,
  createBuildingDnaFromAssistedAnswers,
  createP1SeedGeometry,
  fingerprintBuildingDna,
  getBuildingDnaDependencyTree,
  resolveRomanianNormativeClimateSelection
} from "../index.mjs";
import { createP1SeedMonthlyProfiles } from "./fixtures/p1SeedMonthlyProfiles.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assistedDna() {
  return createBuildingDnaFromAssistedAnswers({
    buildingId: "p1-assisted-house",
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
      reference: "P1.test.assisted_answers"
    },
    monthlyProfiles: createP1SeedMonthlyProfiles()
  });
}

test("assisted answers resolve into canonical Building DNA", () => {
  const result = assistedDna();

  assert.equal(result.status, "ready");
  assert.equal(result.buildingDna.schema, "building_dna_v1");
  assert.equal(result.buildingDna.userMode, "assisted");
  assert.equal(result.buildingDna.assemblies.length, 6);
  assert.equal(result.buildingDna.envelopeElements.length, 7);
  assert.equal(result.buildingDna.monthlyProfiles.length, 12);
  assert.equal(result.buildingDna.renovationInterventions.length, 2);
  assert.equal(result.buildingDna.assemblies[0].layers[0].material.provenance.origin, "proposed_by_typology");
  assert.equal(result.buildingDna.missingConfirmations.includes("confirm_window_system"), true);
  assert.equal(
    result.diagnostics.methodologyLimits.includes("no_physics_calculation"),
    true
  );
});

test("building-specific parameters and boundary context are carried into Building DNA", () => {
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: "p2-assisted-parameterized-house",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: false,
      windowsReplaced: false
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 80,
      windowAreaM2: 12,
      averageRoomHeightM: 2.6,
      ventilationAch: 0.7,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationType: "natural"
    },
    context: {
      attic: "heated",
      basement: "unheated"
    },
    source: {
      reference: "P2.test.assisted_parameters"
    },
    monthlyProfiles: createP1SeedMonthlyProfiles()
  });

  assert.equal(result.status, "ready");
  assert.equal(result.buildingDna.geometry.usefulFloorAreaM2, 80);
  assert.equal(result.buildingDna.geometry.windowAreaM2, 12);
  assert.equal(result.buildingDna.geometry.groundFloorAreaM2, 80);
  assert.equal(result.buildingDna.buildingSpecificParameters.windowAreaM2.value, 12);
  assert.equal(result.buildingDna.buildingSpecificParameters.ventilationAch.value, 0.7);
  assert.equal(result.buildingDna.buildingSpecificParameters.windowOrientation.value, "south");
  assert.equal(result.buildingDna.assemblies[0].assemblyId, "wall_masonry_300_uninsulated");
  assert.equal(
    result.buildingDna.envelopeElements.find(item => item.elementId === "attic-ceiling").boundaryType,
    "adjacent_heated_space"
  );
  assert.equal(
    result.buildingDna.envelopeElements.find(item => item.elementId === "ground-floor").boundaryType,
    "unheated_basement"
  );
});

test("assisted answers block without explicit climate or monthly profile", () => {
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: "p2d-missing-climate-profile",
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
      reference: "P2D.test.missing_climate_profile"
    }
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].code, "missing_climate_profile_selection");
});

test("resolver rejects explicit monthly profiles with shifted calendar order", () => {
  const shifted = createP1SeedMonthlyProfiles();
  const mayIndex = shifted.findIndex((profile) => profile.month === "may");
  const juneIndex = shifted.findIndex((profile) => profile.month === "june");
  const may = shifted[mayIndex];
  shifted[mayIndex] = shifted[juneIndex];
  shifted[juneIndex] = may;

  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: "p3c-shifted-month-profile",
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
      reference: "P3C.test.shifted_month_profile"
    },
    monthlyProfiles: shifted
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].code, "monthly_building_profile_month_order_mismatch");
});

test("advanced and assisted modes can represent equivalent engineering input", () => {
  const assisted = assistedDna().buildingDna;
  const advanced = createBuildingDnaFromAdvancedModel({
    source: { reference: "P1.test.advanced_model" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    building: {
      buildingId: "p1-advanced-house",
      buildingType: "detached_house",
      constructionPeriod: "1978_1990",
      structuralSystem: "masonry"
    }
  });

  assert.equal(advanced.status, "ready");
  assert.equal(advanced.buildingDna.userMode, "advanced");
  assert.equal(advanced.buildingDna.assemblies[0].assemblyId, assisted.assemblies[0].assemblyId);
  assert.equal(advanced.buildingDna.monthlyProfiles[0].heatGains.internalGains.amount, 120);
});

test("advanced Building DNA can carry source-backed Romanian normative climate provider metadata", () => {
  const assisted = assistedDna().buildingDna;
  const climateProviderResult = resolveRomanianNormativeClimateSelection({
    stationId: "mc001_6_2013_bucuresti",
    climateZone: "II",
    windZone: "II"
  });
  const advanced = createBuildingDnaFromAdvancedModel({
    source: { reference: "P5B2.test.normative_climate_provider" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    climate: {
      climateZone: "II",
      windZone: "II"
    },
    climateProviderResult,
    building: {
      buildingId: "p5b2-normative-climate-provider-house",
      buildingType: "detached_house",
      location: {
        country: "RO",
        localityId: "ro_bucuresti",
        city: "Bucuresti"
      }
    }
  });

  assert.equal(advanced.status, "ready");
  assert.equal(advanced.buildingDna.climateProvider.datasetVersion, climateProviderResult.datasetVersion);
  assert.equal(advanced.buildingDna.climateProvider.selection.stationId, "mc001_6_2013_bucuresti");
  assert.equal(
    advanced.buildingDna.climateProvider.datasets.monthlyExteriorTemperature.monthlyRecords[0].value,
    -1.2
  );
  assert.equal(
    advanced.buildingDna.climateProvider.datasets.monthlySolarIrradiation.datasetStatus,
    "NORMATIVE_DATASET"
  );
  assert.equal(
    advanced.buildingDna.climateProvider.datasets.monthlySolarIrradiation.monthlyRecords[0].totalIrradianceWPerM2.horizontal,
    49.6
  );
  assert.equal(advanced.buildingDna.productionClimateProfile.status, "ready_with_bounded_gaps");
  assert.equal(
    advanced.buildingDna.productionClimateProfile.coverage.hasMonthlyExteriorTemperature,
    true
  );
  assert.equal(
    advanced.buildingDna.productionClimateProfile.coverage.hasMonthlySolarIrradianceSourceRows,
    true
  );
  assert.equal(
    advanced.buildingDna.productionClimateProfile.boundedFields.some(
      field => field.parameterId === "source_backed_solar_gains_preprocessing" &&
        field.missingDocument === "SR EN ISO 52010-1"
    ),
    true
  );
  assert.equal(
    advanced.buildingDna.climateProvider.diagnostics.some(item => item.code === "MONTHLY_SOLAR_IRRADIATION_DATASET_REQUIRED"),
    false
  );
  assert.equal(
    advanced.buildingDna.climateProvider.diagnostics.some(item => item.code === "SOLAR_IRRADIATION_PREPROCESSING_STANDARD_REQUIRED_FOR_QSOL"),
    true
  );
  const eligibility = new Map(advanced.buildingDna.climateEligibility.map(item => [item.calculationId, item]));
  assert.equal(
    eligibility.get("chapter2_monthly_transmission_ventilation").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );
  assert.equal(
    eligibility.get("chapter2_solar_source_dataset_identity").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );
  assert.equal(
    eligibility.get("chapter2_solar_gains").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );

  const repeated = createBuildingDnaFromAdvancedModel({
    source: { reference: "P5B2.test.normative_climate_provider" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    climate: {
      climateZone: "II",
      windZone: "II"
    },
    climateProviderResult,
    building: {
      buildingId: "p5b2-normative-climate-provider-house",
      buildingType: "detached_house",
      location: {
        country: "RO",
        localityId: "ro_bucuresti",
        city: "Bucuresti"
      }
    }
  });
  const cluj = createBuildingDnaFromAdvancedModel({
    source: { reference: "P5B2.test.normative_climate_provider" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    climate: {
      climateZone: "II",
      windZone: "II"
    },
    climateProviderResult: resolveRomanianNormativeClimateSelection({
      stationId: "mc001_6_2013_cluj_napoca",
      climateZone: "II",
      windZone: "II"
    }),
    building: {
      buildingId: "p5b2-normative-climate-provider-house",
      buildingType: "detached_house",
      location: {
        country: "RO",
        localityId: "ro_cluj_napoca",
        city: "Cluj-Napoca"
      }
    }
  });
  assert.equal(fingerprintBuildingDna(advanced.buildingDna), fingerprintBuildingDna(repeated.buildingDna));
  assert.notEqual(fingerprintBuildingDna(advanced.buildingDna), fingerprintBuildingDna(cluj.buildingDna));
});

test("advanced Building DNA auto-resolves the production climate profile from supported locality selection", () => {
  const assisted = assistedDna().buildingDna;
  const advanced = createBuildingDnaFromAdvancedModel({
    source: { reference: "P5C.test.production_climate_profile" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    climate: {
      climateZone: "II",
      windZone: "II"
    },
    building: {
      buildingId: "p5c-production-climate-profile-house",
      buildingType: "detached_house",
      location: {
        country: "RO",
        localityId: "ro_bucuresti",
        city: "Bucuresti"
      }
    }
  });

  assert.equal(advanced.status, "ready");
  assert.equal(advanced.buildingDna.climateProvider.selection.stationId, "mc001_6_2013_bucuresti");
  assert.equal(advanced.buildingDna.productionClimateProfile.stationName, "Bucuresti");
  assert.equal(
    advanced.buildingDna.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount,
    -1.2
  );
  assert.equal(
    advanced.buildingDna.monthlyProfiles[0].transmission.cooling.outdoorTemperature.amount,
    30
  );
  assert.equal(
    advanced.buildingDna.productionClimateProfile.fields.some(
      field => field.parameterId === "monthly_exterior_temperature" && field.value.length === 12
    ),
    true
  );
  assert.equal(
    advanced.buildingDna.productionClimateProfile.fields.some(
      field => field.parameterId === "monthly_solar_irradiance_a9_6" && field.value.length === 12
    ),
    true
  );
  assert.equal(
    advanced.buildingDna.productionClimateProfile.coverage.hasSourceBackedSolarGainPreprocessing,
    false
  );
});

test("resolver blocks missing geometry before physics can run", () => {
  const result = createBuildingDnaFromAdvancedModel({
    source: { reference: "P1.test.invalid_advanced_model" },
    assemblySelections: {
      exteriorWall: "wall_masonry_300_eps_100"
    },
    geometry: {},
    monthlyProfiles: createP1SeedMonthlyProfiles()
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].code, "building_dna_missing_assembly_selection");
});

test("engineering override preserves previous value and provenance", () => {
  const dna = assistedDna().buildingDna;
  const result = applyBuildingDnaOverride(dna, {
    overrideId: "override-wall-brick-thickness",
    kind: "assembly_layer_thickness",
    assemblyId: "wall_masonry_300_eps_100",
    layerId: "brick",
    thicknessM: 0.38,
    reason: "measured_on_site",
    source: {
      reference: "P1.test.override.measured_wall"
    }
  });

  assert.equal(result.status, "ready");
  assert.equal(result.override.previousValue.amount, 0.3);
  assert.equal(result.override.newValue.amount, 0.38);
  assert.equal(result.override.provenance.origin, "engineering_override");
  assert.equal(result.buildingDna.overrides.length, 1);
});

test("dependency tree exposes assumptions without calculating", () => {
  const dna = assistedDna().buildingDna;
  const tree = getBuildingDnaDependencyTree(dna, "annualQHnd");

  assert.equal(tree.status, "ready");
  assert.equal(tree.physicsAuthority, "Chapter 2 physics engine");
  assert.equal(tree.nodes.some(node => node.nodeId === "building.envelope.assemblies"), true);
  assert.equal(tree.nodes.some(node => node.nodeId === "building.monthly_profiles"), true);
  assert.equal(tree.formulaReferences.includes("MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX"), true);
});

test("resolver module has no runtime PDF access or downstream calculations", () => {
  const source = readFileSync(
    new URL("../buildingDnaResolver.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "calculateMc001",
    "readFile",
    "fetch(",
    ".pdf",
    "finalEnergy",
    "primaryEnergy",
    "certificateResult"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
