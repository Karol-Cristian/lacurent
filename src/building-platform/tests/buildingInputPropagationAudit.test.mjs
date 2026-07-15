import assert from "node:assert/strict";
import {
  buildBuildingInputPropagationDiff,
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAssistedAnswers,
  createSyntheticSeasonalDemoClimateProfile
} from "../index.mjs";
import {
  P3B_INPUT_PROPAGATION_FIELDS,
  P3B_PROPAGATION_MATRIX_STATUS
} from "./fixtures/p3bInputPropagationMatrixFixture.mjs";

const EPSILON = 1e-9;

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

function buildingDna(overrides = {}) {
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: "p3b-propagation-house",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    wallMaterial: "brick",
    renovations: {
      wallInsulation: "eps",
      wallInsulationThicknessM: 0.1,
      windowsReplaced: true
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      exteriorWallAreaM2: 50,
      roofAreaM2: 120,
      groundFloorAreaM2: 120,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationAch: 0.6
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    climateProfile: createSyntheticSeasonalDemoClimateProfile(),
    allowSyntheticClimate: true,
    source: {
      reference: "P3B.propagation.audit"
    },
    ...overrides
  });
  assert.equal(result.status, "ready");
  return result.buildingDna;
}

function calculate(buildingDna) {
  const calculation = calculateChapter2ForBuildingDna(buildingDna);
  assert.equal(calculation.status, "ready");
  return calculation;
}

function exteriorWall(buildingDna) {
  return buildingDna.assemblies.find((assembly) => assembly.assemblyRole === "exterior_wall");
}

function wallU(calculation, buildingDna) {
  const wall = exteriorWall(buildingDna);
  return calculation.assemblyResult.assemblyResults.find((result) => result.assemblyId === wall.assemblyId).uValue;
}

function annualQHnd(calculation) {
  return calculation.chapter2Result.result.annualQHnd;
}

function annualQCnd(calculation) {
  return calculation.chapter2Result.result.annualQCnd;
}

await test("propagation matrix covers active engineering fields without display-only status", () => {
  assert.equal(P3B_PROPAGATION_MATRIX_STATUS, "P3B_PR1_PROPAGATION_MATRIX_ACTIVE");
  assert.equal(P3B_INPUT_PROPAGATION_FIELDS.length >= 7, true);
  for (const entry of P3B_INPUT_PROPAGATION_FIELDS) {
    assert.notEqual(entry.propagationStatus, "display_only", entry.fieldId);
    assert.notEqual(entry.propagationStatus, "ignored_by_adapter", entry.fieldId);
    assert.notEqual(entry.propagationStatus, "ignored_by_physics_engine", entry.fieldId);
    assert.equal(Array.isArray(entry.engineOutputDependencies), true, entry.fieldId);
    assert.equal(entry.engineOutputDependencies.length > 0, true, entry.fieldId);
  }
});

await test("masonry and timber selections resolve to distinct assemblies and results", () => {
  const masonry = buildingDna();
  const timber = buildingDna({
    structuralSystem: "timber",
    wallMaterial: "wood",
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      exteriorWallAreaM2: 50,
      roofAreaM2: 120,
      groundFloorAreaM2: 120,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationAch: 0.6
    }
  });
  const masonryCalculation = calculate(masonry);
  const timberCalculation = calculate(timber);

  assert.equal(exteriorWall(masonry).assemblyId, "wall_masonry_300_eps_100");
  assert.equal(exteriorWall(timber).assemblyId, "wall_timber_frame_mineral_wool_140");
  assert.notDeepEqual(
    exteriorWall(masonry).layers.map((layer) => layer.materialId),
    exteriorWall(timber).layers.map((layer) => layer.materialId)
  );
  assert.notEqual(wallU(masonryCalculation, masonry), wallU(timberCalculation, timber));
  assert.notEqual(masonryCalculation.envelopeTransmissionResult.result.amount, timberCalculation.envelopeTransmissionResult.result.amount);
  assert.notEqual(annualQHnd(masonryCalculation), annualQHnd(timberCalculation));

  const diff = buildBuildingInputPropagationDiff(
    { buildingDna: masonry, calculation: masonryCalculation },
    { buildingDna: timber, calculation: timberCalculation }
  );
  assert.equal(diff.changed, true);
  assert.equal(diff.assemblyChanges.some((item) => item.path === "assemblies.exterior_wall.assemblyId"), true);
  assert.equal(diff.engineChanges.some((item) => item.path === "envelope.Htr"), true);
});

await test("EPS thickness propagates monotonically through U, Htr and QHnd", () => {
  const cases = [
    { option: false, thickness: undefined, expectedAssembly: "wall_masonry_300_uninsulated" },
    { option: "eps", thickness: 0.05, expectedAssembly: "wall_masonry_300_eps_050" },
    { option: "eps", thickness: 0.1, expectedAssembly: "wall_masonry_300_eps_100" },
    { option: "eps", thickness: 0.15, expectedAssembly: "wall_masonry_300_eps_150" },
    { option: "eps", thickness: 0.2, expectedAssembly: "wall_masonry_300_eps_200" }
  ].map((item) => {
    const dna = buildingDna({
      renovations: {
        wallInsulation: item.option,
        ...(item.thickness === undefined ? {} : { wallInsulationThicknessM: item.thickness }),
        windowsReplaced: true
      }
    });
    const calculation = calculate(dna);
    return {
      ...item,
      dna,
      calculation,
      u: wallU(calculation, dna),
      htr: calculation.envelopeTransmissionResult.result.amount,
      qHnd: annualQHnd(calculation)
    };
  });

  cases.forEach((item) => {
    assert.equal(exteriorWall(item.dna).assemblyId, item.expectedAssembly);
  });
  for (let index = 1; index < cases.length; index += 1) {
    assert.equal(cases[index].u < cases[index - 1].u, true, `U did not decrease at ${index}`);
    assert.equal(cases[index].htr < cases[index - 1].htr, true, `Htr did not decrease at ${index}`);
    assert.equal(cases[index].qHnd < cases[index - 1].qHnd, true, `QHnd did not decrease at ${index}`);
  }
});

await test("window orientation changes solar gains and useful demand but not Htr", () => {
  const south = buildingDna({
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      exteriorWallAreaM2: 50,
      roofAreaM2: 120,
      groundFloorAreaM2: 120,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationAch: 0.6
    }
  });
  const north = buildingDna({
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      exteriorWallAreaM2: 50,
      roofAreaM2: 120,
      groundFloorAreaM2: 120,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: "north",
      ventilationAch: 0.6
    }
  });
  const southCalculation = calculate(south);
  const northCalculation = calculate(north);

  assert.equal(south.monthlyProfiles[0].heatGains.solarOrientation, "south");
  assert.equal(north.monthlyProfiles[0].heatGains.solarOrientation, "north");
  assert.equal(south.monthlyProfiles[0].heatGains.solarGains.amount, 10);
  close(north.monthlyProfiles[0].heatGains.solarGains.amount, 3.5);
  close(southCalculation.envelopeTransmissionResult.result.amount, northCalculation.envelopeTransmissionResult.result.amount);
  assert.notEqual(annualQHnd(southCalculation), annualQHnd(northCalculation));
  assert.notEqual(annualQCnd(southCalculation), annualQCnd(northCalculation));
});

await test("climate profile changes monthly transfer and annual useful demand", () => {
  const colderProfile = createSyntheticSeasonalDemoClimateProfile();
  colderProfile.profileId = "p3b_colder_profile";
  colderProfile.sourceType = "explicit_professional_climate_profile";
  colderProfile.origin = "confirmed_by_user";
  colderProfile.monthlyRecords = colderProfile.monthlyRecords.map((record) => ({
    ...record,
    heatingOutdoorTemperatureC: record.heatingOutdoorTemperatureC - 1,
    coolingOutdoorTemperatureC: record.coolingOutdoorTemperatureC - 0.5,
    solarGainsKwh: record.solarGainsKwh * 0.95,
    solarGainsByOrientationKwh: Object.fromEntries(
      Object.entries(record.solarGainsByOrientationKwh).map(([key, value]) => [key, value * 0.95])
    )
  }));
  const baseline = buildingDna();
  const colder = buildingDna({
    climateProfile: colderProfile,
    allowSyntheticClimate: false
  });
  const baselineCalculation = calculate(baseline);
  const colderCalculation = calculate(colder);

  assert.notEqual(baseline.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount, colder.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount);
  assert.notEqual(baselineCalculation.chapter2Result.result.monthlyResults[0].transmission.heating.transmissionEnergy.amount, colderCalculation.chapter2Result.result.monthlyResults[0].transmission.heating.transmissionEnergy.amount);
  assert.notEqual(annualQHnd(baselineCalculation), annualQHnd(colderCalculation));
  assert.notEqual(annualQCnd(baselineCalculation), annualQCnd(colderCalculation));
});
