import assert from "node:assert/strict";
import {
  buildBuildingInputPropagationDiff,
  buildBuildingTechnicalWorkspace,
  buildOrientationComparisonTable,
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

function baseBuildingSpecificParameters(overrides = {}) {
  return {
    usefulFloorAreaM2: 120,
    exteriorWallAreaM2: 50,
    roofAreaM2: 120,
    groundFloorAreaM2: 120,
    atticCeilingAreaM2: 120,
    windowAreaM2: 8,
    mainOrientation: "south",
    windowOrientation: "south",
    ventilationAch: 0.6,
    ...overrides
  };
}

function calculate(buildingDna) {
  const calculation = calculateChapter2ForBuildingDna(buildingDna);
  assert.equal(calculation.status, "ready");
  return calculation;
}

function exteriorWall(buildingDna) {
  return buildingDna.assemblies.find((assembly) => assembly.assemblyRole === "exterior_wall");
}

function assemblyByRole(buildingDna, role) {
  return buildingDna.assemblies.find((assembly) => assembly.assemblyRole === role);
}

function wallU(calculation, buildingDna) {
  const wall = exteriorWall(buildingDna);
  return calculation.assemblyResult.assemblyResults.find((result) => result.assemblyId === wall.assemblyId).uValue;
}

function assemblyU(calculation, buildingDna, role) {
  const assembly = assemblyByRole(buildingDna, role);
  return calculation.assemblyResult.assemblyResults.find((result) => result.assemblyId === assembly.assemblyId).uValue;
}

function annualQHnd(calculation) {
  return calculation.chapter2Result.result.annualQHnd;
}

function annualQCnd(calculation) {
  return calculation.chapter2Result.result.annualQCnd;
}

function controlledOrientationRun(orientation) {
  const dna = buildingDna({
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      exteriorWallAreaM2: 50,
      roofAreaM2: 120,
      groundFloorAreaM2: 120,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: orientation,
      ventilationAch: 0.6
    }
  });
  const calculation = calculate(dna);
  const workspace = buildBuildingTechnicalWorkspace({
    status: "ready",
    buildingDna: dna,
    calculation,
    review: { dependencyTrees: {} }
  });
  assert.equal(workspace.status, "ready");
  return { orientation, buildingDna: dna, calculation, workspace };
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

await test("explicit exterior wall area changes Hd, Htr and annual QHnd", () => {
  const base = buildingDna({
    buildingSpecificParameters: baseBuildingSpecificParameters({
      exteriorWallAreaM2: 50
    })
  });
  const larger = buildingDna({
    buildingSpecificParameters: baseBuildingSpecificParameters({
      exteriorWallAreaM2: 80
    })
  });
  const baseCalculation = calculate(base);
  const largerCalculation = calculate(larger);
  const baseHd = baseCalculation.envelopeTransmissionResult.components.Hd.amount;
  const largerHd = largerCalculation.envelopeTransmissionResult.components.Hd.amount;

  assert.equal(base.geometry.exteriorWallAreaM2, 50);
  assert.equal(larger.geometry.exteriorWallAreaM2, 80);
  assert.equal(largerHd > baseHd, true);
  assert.equal(
    largerCalculation.envelopeTransmissionResult.result.amount >
      baseCalculation.envelopeTransmissionResult.result.amount,
    true
  );
  assert.equal(annualQHnd(largerCalculation) > annualQHnd(baseCalculation), true);
});

await test("heated volume with ACH derives ventilation flow and changes annual QHnd", () => {
  const smallerVolume = buildingDna({
    buildingSpecificParameters: baseBuildingSpecificParameters({
      heatedVolumeM3: 156,
      ventilationAch: 0.6
    })
  });
  const largerVolume = buildingDna({
    buildingSpecificParameters: baseBuildingSpecificParameters({
      heatedVolumeM3: 312,
      ventilationAch: 0.6
    })
  });
  const smallerCalculation = calculate(smallerVolume);
  const largerCalculation = calculate(largerVolume);

  close(smallerVolume.monthlyProfiles[0].ventilation.heating.airFlowRate.amount, 0.026);
  close(largerVolume.monthlyProfiles[0].ventilation.heating.airFlowRate.amount, 0.052);
  assert.equal(
    largerCalculation.chapter2Result.result.monthlyResults[0].ventilation.heating.ventilationEnergy.amount >
      smallerCalculation.chapter2Result.result.monthlyResults[0].ventilation.heating.ventilationEnergy.amount,
    true
  );
  assert.equal(annualQHnd(largerCalculation) > annualQHnd(smallerCalculation), true);
});

await test("useful floor area seeds roof and ground areas only when explicit envelope areas are absent", () => {
  const seededSmall = buildingDna({
    buildingSpecificParameters: {
      usefulFloorAreaM2: 100,
      exteriorWallAreaM2: 50,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationAch: 0.6
    }
  });
  const seededLarge = buildingDna({
    buildingSpecificParameters: {
      usefulFloorAreaM2: 140,
      exteriorWallAreaM2: 50,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationAch: 0.6
    }
  });
  const explicitSmall = buildingDna({
    buildingSpecificParameters: baseBuildingSpecificParameters({
      usefulFloorAreaM2: 100
    })
  });
  const explicitLarge = buildingDna({
    buildingSpecificParameters: baseBuildingSpecificParameters({
      usefulFloorAreaM2: 140
    })
  });
  const seededSmallCalculation = calculate(seededSmall);
  const seededLargeCalculation = calculate(seededLarge);
  const explicitSmallCalculation = calculate(explicitSmall);
  const explicitLargeCalculation = calculate(explicitLarge);

  assert.equal(seededSmall.geometry.roofAreaM2, 100);
  assert.equal(seededLarge.geometry.roofAreaM2, 140);
  assert.equal(seededLargeCalculation.envelopeTransmissionResult.result.amount > seededSmallCalculation.envelopeTransmissionResult.result.amount, true);
  assert.equal(explicitSmall.geometry.roofAreaM2, 120);
  assert.equal(explicitLarge.geometry.roofAreaM2, 120);
  close(explicitSmallCalculation.envelopeTransmissionResult.result.amount, explicitLargeCalculation.envelopeTransmissionResult.result.amount);
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

await test("controlled north east south west orientation comparison has physically correct direction", () => {
  const runs = ["north", "east", "south", "west"].map(controlledOrientationRun);
  const [north, east, south, west] = runs;
  const table = buildOrientationComparisonTable(runs);
  const byOrientation = new Map(table.map((row) => [row.orientation, row]));

  assert.equal(table.length, 4);
  assert.deepEqual(table.map((row) => row.finalAzimuth), ["north", "east", "south", "west"]);
  assert.equal(new Set(table.map((row) => row.calculationFingerprint)).size, 4);

  for (const run of runs) {
    const dna = run.buildingDna;
    const calculation = run.calculation;
    assert.equal(dna.buildingSpecificParameters.exteriorWallAreaM2.value, 50);
    assert.equal(dna.buildingSpecificParameters.windowAreaM2.value, 8);
    assert.equal(dna.buildingSpecificParameters.windowOrientation.value, run.orientation);
    assert.equal(dna.monthlyProfiles[0].heatGains.solarOrientation, run.orientation);
    assert.equal(dna.monthlyProfiles[0].heatGains.solarGainsSource, "monthly_record_orientation_solar_gains");
    close(assemblyU(calculation, dna, "window"), 1.2);
    close(calculation.envelopeTransmissionResult.result.amount, 112.5610825363045);
    close(calculation.chapter2Result.result.monthlyResults[0].ventilation.heating.ventilationEnergy.amount, 312.48);
    assert.equal(calculation.chapter2Result.result.monthlyResults[0].heatGains.internalGains, 10);
    assert.equal(calculation.chapter2Result.result.monthlyResults[0].transmission.heating.transmissionEnergy.amount, north.calculation.chapter2Result.result.monthlyResults[0].transmission.heating.transmissionEnergy.amount);
    assert.equal(calculation.chapter2Result.result.heatingResult.caseResults[0].formulaCode, "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH");
    assert.equal(calculation.chapter2Result.result.coolingResult.caseResults[0].formulaCode, "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND");
    assert.equal(run.workspace.report.calculationFingerprint.fingerprintId, run.workspace.calculationFingerprint.fingerprintId);
  }

  close(byOrientation.get("north").monthlySolarGainsKwh.find((item) => item.month === "january").solarGainsKwh, 3.5);
  close(byOrientation.get("east").monthlySolarGainsKwh.find((item) => item.month === "january").solarGainsKwh, 7);
  close(byOrientation.get("south").monthlySolarGainsKwh.find((item) => item.month === "january").solarGainsKwh, 10);
  close(byOrientation.get("west").monthlySolarGainsKwh.find((item) => item.month === "january").solarGainsKwh, 7);
  close(byOrientation.get("north").monthlySolarGainsKwh.find((item) => item.month === "july").solarGainsKwh, 182);
  close(byOrientation.get("east").monthlySolarGainsKwh.find((item) => item.month === "july").solarGainsKwh, 364);
  close(byOrientation.get("south").monthlySolarGainsKwh.find((item) => item.month === "july").solarGainsKwh, 520);
  close(byOrientation.get("west").monthlySolarGainsKwh.find((item) => item.month === "july").solarGainsKwh, 364);

  close(byOrientation.get("north").annualSolarGainsKwh, 591.5);
  close(byOrientation.get("east").annualSolarGainsKwh, 1183);
  close(byOrientation.get("south").annualSolarGainsKwh, 1690);
  close(byOrientation.get("west").annualSolarGainsKwh, 1183);
  close(byOrientation.get("north").htr, byOrientation.get("south").htr);
  close(byOrientation.get("east").htr, byOrientation.get("west").htr);
  close(byOrientation.get("north").annualQHnd, 9919.183279805988);
  close(byOrientation.get("east").annualQHnd, 9827.371483473042);
  close(byOrientation.get("south").annualQHnd, 9764.74814500369);
  close(byOrientation.get("west").annualQHnd, 9827.371483473042);
  close(byOrientation.get("north").annualQCnd, 0);
  close(byOrientation.get("east").annualQCnd, 56.6978284800191);
  close(byOrientation.get("south").annualQCnd, 178.72396549996142);
  close(byOrientation.get("west").annualQCnd, 56.6978284800191);

  assert.equal(byOrientation.get("south").annualSolarGainsKwh > byOrientation.get("north").annualSolarGainsKwh, true);
  assert.equal(byOrientation.get("south").annualQHnd <= byOrientation.get("north").annualQHnd, true);
  assert.equal(byOrientation.get("south").annualQCnd >= byOrientation.get("north").annualQCnd, true);
  assert.equal(byOrientation.get("east").annualQHnd, byOrientation.get("west").annualQHnd);
});

await test("explicit window orientation is not rotated again by main building orientation", () => {
  const explicitSouthOnNorthMain = buildingDna({
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      exteriorWallAreaM2: 50,
      roofAreaM2: 120,
      groundFloorAreaM2: 120,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "north",
      windowOrientation: "south",
      ventilationAch: 0.6
    }
  });
  const fallbackEast = buildingDna({
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      exteriorWallAreaM2: 50,
      roofAreaM2: 120,
      groundFloorAreaM2: 120,
      atticCeilingAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "east",
      windowOrientation: "unknown",
      ventilationAch: 0.6
    }
  });

  assert.equal(explicitSouthOnNorthMain.monthlyProfiles[0].heatGains.solarOrientation, "south");
  assert.equal(explicitSouthOnNorthMain.monthlyProfiles[0].heatGains.solarGains.amount, 10);
  assert.equal(fallbackEast.monthlyProfiles[0].heatGains.solarOrientation, "east");
  assert.equal(fallbackEast.monthlyProfiles[0].heatGains.solarGains.amount, 7);
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
