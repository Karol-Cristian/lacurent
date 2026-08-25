import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLIMATE_DATASET_STATUSES,
  CLIMATE_PLATFORM_VERSION,
  CLIMATE_RUNTIME_ELIGIBILITY_STATUSES,
  CLIMATE_SOURCE_CONTRACTS,
  MC001_NZEB_LIMITS_TABLE_2_10A,
  MC001_RENOVATION_LIMITS_TABLE_2_10B,
  MC001_SOLAR_FACTOR_GN_RECOMMENDATIONS,
  MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE,
  MONTH_IDS,
  ROMANIAN_CLIMATE_ACQUISITION_LIST,
  ROMANIAN_CLIMATE_COVERAGE,
  ROMANIAN_CLIMATE_DATA_DOMAINS,
  ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES,
  ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
  ROMANIAN_CLIMATE_PROFILES,
  ROMANIAN_CLIMATE_SOURCE_AUDIT,
  ROMANIAN_CLIMATE_SOURCE_INVENTORY,
  ROMANIAN_CLIMATE_ZONE_IDS,
  ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  ROMANIAN_WIND_ZONE_IDS,
  analyzeClimateProfileSeasonality,
  analyzeMonthlyUsefulDemandSeasonality,
  climateProfileToBuildingMonthlyProfiles,
  createSyntheticSeasonalDemoClimateProfile,
  evaluateClimateCalculationEligibility,
  findRomanianClimateProfileById,
  getClimateZoneDependentRequirements,
  getMc001PrimaryCo2Limit,
  getRomanianClimateZone,
  getSolarFactorRecommendation,
  getWinterDesignTemperatureByClimateZone,
  listRomanianClimateZones,
  listRomanianClimateProfiles,
  resolveClimateProfileSelection,
  resolveRomanianLocationClimate,
  searchRomanianClimateProfiles,
  validateCertifiedClimateDataset,
  validateClimateProfile,
  validateRomanianClimateZone,
  validateRomanianWindZone
} from "../index.mjs";
import {
  P3C_ACTIVE_PRODUCTION_CLIMATE_MODULES,
  P3C_CLIMATE_MONTHLY_INVENTORY_STATUS,
  P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY
} from "./fixtures/p3cClimateMonthlyInventoryFixture.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const DEMO_PROFILE_ID = "ro_synthetic_bucharest_seasonal_demo_v1";

test("P5A climate-zone registry exposes all five MC001 Romanian climate zones and wind zones", () => {
  assert.deepEqual(ROMANIAN_CLIMATE_ZONE_IDS, ["I", "II", "III", "IV", "V"]);
  assert.deepEqual(ROMANIAN_WIND_ZONE_IDS, ["I", "II", "III", "IV"]);
  assert.equal(listRomanianClimateZones().length, 5);
  assert.equal(getRomanianClimateZone("IV").datasetVersion, ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION);
  assert.equal(validateRomanianClimateZone("V"), true);
  assert.equal(validateRomanianClimateZone("VI"), false);
  assert.equal(validateRomanianWindZone("IV"), true);
  assert.equal(validateRomanianWindZone("V"), false);
  assert.equal(ROMANIAN_CLIMATE_COVERAGE.coveredClimateZones, 5);
  assert.equal(ROMANIAN_CLIMATE_COVERAGE.totalSourceBackedLocalityMappings, 0);
});

test("P5A source-backed MC001 climate-zone lookup tables preserve values and source scope", () => {
  assert.equal(
    MC001_SOLAR_FACTOR_GN_RECOMMENDATIONS.residential.exposedToDirectSolarRadiation.I.min,
    0.30
  );
  assert.equal(
    MC001_SOLAR_FACTOR_GN_RECOMMENDATIONS.residential.exposedToDirectSolarRadiation.V.comparator,
    "greater_than"
  );
  assert.equal(
    MC001_SOLAR_FACTOR_GN_RECOMMENDATIONS.nonResidential.exposedToDirectSolarRadiation.IV.max,
    0.43
  );
  assert.equal(
    MC001_NZEB_LIMITS_TABLE_2_10A.values.III.residential_individual.primaryEnergyKwhM2Year,
    133.3
  );
  assert.equal(
    MC001_NZEB_LIMITS_TABLE_2_10A.values.V.commercial.co2KgM2Year,
    16.0
  );
  assert.equal(
    MC001_RENOVATION_LIMITS_TABLE_2_10B.values.I.office.primaryEnergyKwhM2Year,
    113.5
  );
  assert.equal(
    MC001_RENOVATION_LIMITS_TABLE_2_10B.values.V.sports.co2KgM2Year,
    20.3
  );
});

test("P5A location climate resolver records explicit selection and missing locality mapping honestly", () => {
  const selected = resolveRomanianLocationClimate({
    countyName: "Cluj",
    localityName: "Cluj-Napoca",
    climateZone: "III",
    windZone: "II"
  });
  assert.equal(selected.status, "ready");
  assert.equal(selected.climate.climateZone, "III");
  assert.equal(selected.climate.assignmentOrigin, "manual_zone_selection");
  assert.equal(
    selected.climate.localityMappingStatus,
    "locality_mapping_not_available_in_mc001"
  );
  assert.equal(
    selected.climate.monthlyClimateStatus,
    "monthly_temperature_and_solar_dataset_not_reproduced_in_mc001_pdf_body"
  );

  const missing = resolveRomanianLocationClimate({
    countyName: "Cluj",
    localityName: "Cluj-Napoca"
  });
  assert.equal(missing.status, "ready");
  assert.equal(
    missing.diagnostics.some(item => item.code === "CLIMATE_SELECTION_REQUIRED"),
    true
  );

  const invalid = resolveRomanianLocationClimate({ climateZone: "VI" });
  assert.equal(invalid.status, "blocked");
  assert.equal(invalid.diagnostics[0].code, "invalid_romanian_climate_zone");
});

test("P5A climate-zone dependent requirements change when the selected zone changes", () => {
  const zoneI = getClimateZoneDependentRequirements({ climateZone: "I" });
  const zoneV = getClimateZoneDependentRequirements({ climateZone: "V" });
  assert.equal(zoneI.status, "ready");
  assert.equal(zoneV.status, "ready");
  assert.notDeepEqual(zoneI.solarFactor.recommendation, zoneV.solarFactor.recommendation);
  assert.notEqual(
    zoneI.nzebLimit.limit.primaryEnergyKwhM2Year,
    zoneV.nzebLimit.limit.primaryEnergyKwhM2Year
  );
  assert.equal(
    getSolarFactorRecommendation({ climateZone: "II", buildingUse: "non_residential" }).recommendation.min,
    0.21
  );
  assert.equal(
    getMc001PrimaryCo2Limit({
      climateZone: "IV",
      buildingType: "residential_individual",
      status: "renovation"
    }).limit.co2KgM2Year,
    27.5
  );
});

test("P5B3 climate source inventory marks monthly temperature and A.9.6 solar as source-backed", () => {
  const monthly = ROMANIAN_CLIMATE_SOURCE_INVENTORY.find(
    entry => entry.inventoryId === "mc001_monthly_temperature_and_solar_climate_annex"
  );
  assert.equal(monthly.status, "implemented_temperature_and_a9_6_solar_where_source_locality_is_covered");
  assert.equal(monthly.containsMonthlyClimateInputs, true);
  assert.equal(
    monthly.implementedArtifacts.includes("Mc001/6-2013 Tabel II.1 monthly mean exterior temperature for 42 localities"),
    true
  );
  assert.match(monthly.solarArtifact, /Anexa A\.9\.6/);
});

test("P5A separates climate zone wind zone locality monthly design and degree-day domains", () => {
  const domains = new Map(ROMANIAN_CLIMATE_DATA_DOMAINS.map(item => [item.domainId, item]));
  for (const domainId of [
    "climate_zone_classification",
    "wind_zone_classification",
    "locality_assignment",
    "monthly_energy_climate_data",
    "heating_design_climate",
    "cooling_ventilation_design_climate",
    "degree_day_data"
  ]) {
    assert.equal(domains.has(domainId), true, domainId);
  }
  assert.equal(domains.get("climate_zone_classification").status, CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET);
  assert.equal(domains.get("monthly_energy_climate_data").status, CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET);
  assert.equal(domains.get("locality_assignment").status, CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE);
  assert.equal(domains.get("heating_design_climate").implementedDataset, MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.datasetId);
});

test("P5A winter exterior design temperature lookup is zone-backed but not a monthly profile", () => {
  assert.deepEqual(MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.values, {
    I: -12,
    II: -15,
    III: -18,
    IV: -21,
    V: -24
  });
  const zoneI = getWinterDesignTemperatureByClimateZone("I");
  const zoneV = getWinterDesignTemperatureByClimateZone("V");
  assert.equal(zoneI.status, "ready");
  assert.equal(zoneI.value, -12);
  assert.equal(zoneV.value, -24);
  assert.match(zoneI.sourceReference, /Figura 2\.1/);
  assert.equal(getWinterDesignTemperatureByClimateZone("VI").code, "invalid_romanian_climate_zone");
});

test("P5A runtime eligibility does not treat zone labels as monthly climate datasets", () => {
  const missingProfile = evaluateClimateCalculationEligibility({
    climate: { climateZone: "III" },
    climateProfile: null,
    monthlyProfiles: null
  });
  const byId = new Map(missingProfile.map(item => [item.calculationId, item]));
  assert.equal(byId.get("climate_zone_threshold_lookup").status, CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE);
  assert.equal(byId.get("winter_design_temperature_lookup").status, CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE);
  assert.equal(
    byId.get("chapter2_monthly_transmission_ventilation").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA
  );
  assert.equal(
    byId.get("chapter2_solar_gains").diagnostic,
    "MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION"
  );

  const demoSelection = resolveClimateProfileSelection({
    profileId: DEMO_PROFILE_ID,
    allowSynthetic: true
  });
  const demoEligibility = evaluateClimateCalculationEligibility({
    climate: { climateZone: "III" },
    climateProfile: demoSelection.profile,
    monthlyProfiles: climateProfileToBuildingMonthlyProfiles(demoSelection.profile).monthlyProfiles
  });
  assert.equal(
    demoEligibility.find(item => item.calculationId === "chapter2_monthly_transmission_ventilation").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.TEST_ONLY_NOT_PRODUCTION
  );
});

test("P5A normative dependency register identifies exact external documents and prohibited substitutes", () => {
  const dependencies = new Map(ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES.map(item => [item.dependencyId, item]));
  assert.equal(dependencies.has("mc001_6_2013_climate_parameters_volume"), true);
  assert.equal(dependencies.has("mc001_1_2006_annex_a9_6_monthly_solar_irradiation"), true);
  assert.equal(dependencies.has("sr_en_iso_52010_1_climate_preprocessing"), true);
  assert.equal(
    dependencies.get("mc001_6_2013_climate_parameters_volume").availability,
    "public_official_mdlpa_pdf_identified"
  );
  assert.match(
    dependencies.get("mc001_6_2013_climate_parameters_volume").officialUrl,
    /mdlpa\.ro/
  );
  assert.equal(
    dependencies.get("mc001_1_2006_annex_a9_6_monthly_solar_irradiation").implementationStatus,
    "source_packed_ingestion_complete"
  );
  assert.equal(
    dependencies.get("mc001_1_2006_annex_a9_6_monthly_solar_irradiation").presentInRepository,
    true
  );
  assert.match(
    dependencies.get("mc001_6_2013_climate_parameters_volume").prohibitedSubstitute,
    /Do not infer locality assignment/
  );
  assert.equal(
    dependencies.get("sr_1907_1_2_4839_6648_reviewed_not_direct_mc0012022_dependency").calculationsAffected.length,
    0
  );
  assert.equal(ROMANIAN_CLIMATE_ACQUISITION_LIST.length >= 2, true);
  assert.equal(
    ROMANIAN_CLIMATE_REQUIREMENT_MATRIX.some(item => item.missingDiagnostic === "COOLING_VENTILATION_DESIGN_CLIMATE_REQUIRED"),
    true
  );
});

function certifiedClimateInput(overrides = {}) {
  const demo = createSyntheticSeasonalDemoClimateProfile();
  return {
    datasetId: "certified_cluj_station_2026_v1",
    datasetVersion: "2026.1",
    displayName: "Profil certificat Cluj test",
    sourceTitle: "Set climatic certificat de test",
    sourceAuthority: "Inginer auditor test",
    sourceEdition: "2026",
    stationId: "cluj_test_station",
    stationName: "Cluj Test",
    localityName: "Cluj-Napoca",
    countyName: "Cluj",
    climateZone: "III",
    units: {
      temperature: "degC",
      duration: "h",
      solarEnergy: "kWh"
    },
    userConfirmation: true,
    monthlyRecords: demo.monthlyRecords.map(record => ({
      month: record.month,
      durationHours: record.durationHours,
      heatingOutdoorTemperatureC: record.heatingOutdoorTemperatureC,
      coolingOutdoorTemperatureC: record.coolingOutdoorTemperatureC,
      solarGainsKwh: record.solarGainsKwh,
      solarGainsByOrientationKwh: record.solarGainsByOrientationKwh,
      provenance: "certified test fixture row"
    })),
    ...overrides
  };
}

test("P5A certified climate-data import validates completeness units provenance and fingerprintable output", () => {
  const validation = validateCertifiedClimateDataset(certifiedClimateInput());
  assert.equal(validation.ok, true);
  assert.equal(validation.profile.datasetStatus, CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET);
  assert.equal(validation.profile.stationId, "cluj_test_station");
  assert.equal(validation.profile.checksum.startsWith("fnv1a32:"), true);
  assert.equal(validateClimateProfile(validation.profile).ok, true);

  const converted = climateProfileToBuildingMonthlyProfiles(validation.profile, { solarOrientation: "south" });
  assert.equal(converted.status, "ready");
  assert.equal(converted.monthlyProfiles.length, 12);

  const eligibility = evaluateClimateCalculationEligibility({
    climate: { climateZone: "III" },
    climateProfile: validation.profile,
    monthlyProfiles: converted.monthlyProfiles
  });
  assert.equal(
    eligibility.find(item => item.calculationId === "chapter2_monthly_transmission_ventilation").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );
  assert.equal(
    eligibility.find(item => item.calculationId === "chapter2_solar_gains").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );
});

test("P5A certified climate-data import rejects incomplete hidden or unsupported data", () => {
  assert.equal(
    validateCertifiedClimateDataset(certifiedClimateInput({ userConfirmation: false })).code,
    "certified_climate_dataset_requires_user_confirmation"
  );
  assert.equal(
    validateCertifiedClimateDataset(certifiedClimateInput({ units: { temperature: "C", duration: "h", solarEnergy: "kWh" } })).code,
    "certified_climate_dataset_missing_or_invalid_units"
  );
  assert.equal(
    validateCertifiedClimateDataset(certifiedClimateInput({ monthlyRecords: certifiedClimateInput().monthlyRecords.slice(0, 11) })).code,
    "certified_climate_dataset_requires_twelve_months"
  );
  assert.equal(
    validateCertifiedClimateDataset(certifiedClimateInput({ climateZone: "VI" })).code,
    "certified_climate_dataset_invalid_climate_zone"
  );
  assert.equal(
    validateCertifiedClimateDataset(certifiedClimateInput({ windZone: "V" })).code,
    "certified_climate_dataset_invalid_wind_zone"
  );
  const badOrientation = certifiedClimateInput();
  badOrientation.monthlyRecords[0] = {
    ...badOrientation.monthlyRecords[0],
    solarGainsByOrientationKwh: {
      ...badOrientation.monthlyRecords[0].solarGainsByOrientationKwh,
      upward_diagonal: 1
    }
  };
  assert.equal(
    validateCertifiedClimateDataset(badOrientation).code,
    "certified_climate_dataset_unsupported_orientation"
  );
  const missingProvenance = certifiedClimateInput();
  missingProvenance.monthlyRecords[1] = {
    ...missingProvenance.monthlyRecords[1],
    provenance: ""
  };
  assert.equal(
    validateCertifiedClimateDataset(missingProvenance).code,
    "certified_climate_dataset_missing_monthly_provenance"
  );
});

test("P3C climate inventory classifies synthetic and validation monthly sources", () => {
  assert.equal(P3C_CLIMATE_MONTHLY_INVENTORY_STATUS, "P3C_CLIMATE_MONTHLY_INVENTORY_V1");
  assert.equal(P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY.length >= 4, true);

  for (const entry of P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY) {
    assert.equal(typeof entry.inventoryId, "string", entry.inventoryId);
    assert.equal(typeof entry.file, "string", entry.inventoryId);
    assert.equal(typeof entry.classification, "string", entry.inventoryId);
    assert.equal(typeof entry.source, "string", entry.inventoryId);
    assert.equal(Array.isArray(entry.consumers), true, entry.inventoryId);
    assert.equal(typeof entry.canReachProduction, "boolean", entry.inventoryId);
    assert.equal(typeof entry.containsFixedMonthlyInputs, "boolean", entry.inventoryId);
    assert.equal(typeof entry.containsFixedMonthlyOutputs, "boolean", entry.inventoryId);
    assert.equal(typeof entry.bypassesClimateCalculations, "boolean", entry.inventoryId);
  }

  const branchFixture = P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY.find(
    (entry) => entry.inventoryId === "test.p1_seed_monthly_branch_fixture"
  );
  assert.equal(branchFixture.canReachProduction, false);
  assert.equal(branchFixture.containsBranchForcingPattern, true);
  assert.equal(
    P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY.some((entry) => entry.inventoryId === "production.synthetic_demo_climate_profile"),
    true
  );
  const syntheticProfile = P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY.find(
    (entry) => entry.inventoryId === "production.synthetic_demo_climate_profile"
  );
  assert.equal(syntheticProfile.canReachProduction, false);
  assert.equal(
    P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY.some((entry) => entry.inventoryId === "ui.demo_prefill_answers"),
    false
  );
});

test("active production climate path does not import validation expected outputs or branch fixtures", () => {
  for (const file of P3C_ACTIVE_PRODUCTION_CLIMATE_MODULES) {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
    for (const forbidden of [
      "p1SeedMonthlyProfiles",
      "mc001Chapter2ValidationMatrixFixture",
      "validation-reference/python-mc001/expected",
      "expected_output",
      "expectedOutputs"
    ]) {
      assert.equal(source.includes(forbidden), false, `${file} imports or references ${forbidden}`);
    }
  }
});

test("Romanian climate source audit distinguishes missing official data from legacy estimates", () => {
  assert.equal(ROMANIAN_CLIMATE_SOURCE_AUDIT.auditId, "P2D_ROMANIAN_CLIMATE_SOURCE_AUDIT_V1");
  assert.equal(
    ROMANIAN_CLIMATE_SOURCE_AUDIT.localExtractionNote,
    "docs/mc001-extraction/17_climate_annex.md"
  );
  assert.match(ROMANIAN_CLIMATE_SOURCE_AUDIT.conclusion, /delegates climate parameters to Mc001\/6-2013/);
  assert.equal(
    ROMANIAN_CLIMATE_SOURCE_AUDIT.existingRepositoryData.find(
      (entry) => entry.path === "src/features/energy/physics/registries/monthlyClimate.registry.ts"
    ).productionUse,
    false
  );
  assert.equal(
    ROMANIAN_CLIMATE_SOURCE_AUDIT.requiredExternalSources.some(
      (entry) => entry.sourceId === "official_romanian_monthly_climate_dataset"
    ),
    true
  );
});

test("climate source contracts block unverified normative lookup and allow explicit professional profiles", () => {
  const contractsById = new Map(CLIMATE_SOURCE_CONTRACTS.map((contract) => [contract.contractId, contract]));
  assert.equal(
    contractsById.get("romanian_normative_climate_catalogue").status,
    "external_normative_dependency_with_explicit_contract"
  );
  assert.equal(contractsById.get("romanian_normative_climate_catalogue").allowedForVerifiedCalculation, false);
  assert.equal(contractsById.get("explicit_professional_climate_profile").allowedForVerifiedCalculation, true);
  assert.equal(contractsById.get("synthetic_demo_profile").verificationStatus, "synthetic_demo_not_normative");
});

test("synthetic demo climate profile is valid but not listed as verified normative data", () => {
  const allProfiles = listRomanianClimateProfiles({ includeSynthetic: true });
  const productionProfiles = listRomanianClimateProfiles({ includeSynthetic: false });
  const demo = findRomanianClimateProfileById(DEMO_PROFILE_ID);

  assert.equal(allProfiles.length, ROMANIAN_CLIMATE_PROFILES.length);
  assert.equal(productionProfiles.some((profile) => profile.profileId === DEMO_PROFILE_ID), false);
  assert.equal(demo.datasetVersion, CLIMATE_PLATFORM_VERSION);
  assert.equal(demo.sourceType, "synthetic_demo_profile");
  assert.equal(demo.verificationStatus, "synthetic_demo_not_verified");
  assert.equal(validateClimateProfile(demo).ok, true);
  assert.equal(demo.monthlyRecords.length, 12);
  assert.deepEqual(demo.monthlyRecords.map((record) => record.month), MONTH_IDS);
  assert.equal(new Set(demo.monthlyRecords.map((record) => record.durationHours)).size > 1, true);
  assert.equal(new Set(demo.monthlyRecords.map((record) => record.heatingOutdoorTemperatureC)).size > 1, true);
  assert.equal(demo.monthlyRecords.find((record) => record.month === "may").solarGainsKwh, 30);
  assert.equal(demo.monthlyRecords.find((record) => record.month === "july").solarGainsKwh, 520);
  assert.equal(demo.monthlyRecords.find((record) => record.month === "october").solarGainsKwh, 15);
});

test("profile search finds the demo locality while preserving same-name disambiguation metadata", () => {
  const matches = searchRomanianClimateProfiles("bucuresti", { includeSynthetic: true });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].profileId, DEMO_PROFILE_ID);
  assert.equal(matches[0].county, "Bucuresti");
  assert.equal(matches[0].sourceReferences.includes("P2D.synthetic_seasonal_profile.ui_demonstration_only"), true);
});

test("synthetic profile requires explicit demo permission and missing profiles block deterministically", () => {
  assert.equal(
    resolveClimateProfileSelection({ profileId: DEMO_PROFILE_ID }).status,
    "blocked"
  );
  assert.equal(
    resolveClimateProfileSelection({ profileId: DEMO_PROFILE_ID }).code,
    "synthetic_climate_profile_requires_demo_or_explicit_estimated_mode"
  );
  assert.equal(
    resolveClimateProfileSelection({ profileId: "missing-profile", allowSynthetic: true }).code,
    "unsupported_climate_profile_id"
  );
  assert.equal(
    resolveClimateProfileSelection({ allowSynthetic: true }).code,
    "missing_climate_profile_selection"
  );
});

test("synthetic profile converts to twelve explicit Building DNA monthly records with provenance", () => {
  const selection = resolveClimateProfileSelection({
    profileId: DEMO_PROFILE_ID,
    allowSynthetic: true
  });
  const converted = climateProfileToBuildingMonthlyProfiles(selection.profile);
  const monthlyProfiles = converted.monthlyProfiles;

  assert.equal(selection.status, "ready");
  assert.equal(selection.calculationMode, "synthetic_demo");
  assert.equal(converted.status, "ready");
  assert.equal(monthlyProfiles.length, 12);
  assert.equal(monthlyProfiles[0].provenance.origin, "synthetic_demo_profile");
  assert.equal(monthlyProfiles[0].provenance.profileId, DEMO_PROFILE_ID);
  assert.equal(monthlyProfiles[0].heatingIndoorTemperatureC, 20);
  assert.equal(monthlyProfiles[0].coolingIndoorTemperatureC, 24);
  assert.equal(monthlyProfiles[0].solarOrientation, null);
  assert.equal(monthlyProfiles[0].solarGainsSource, "monthly_record_direct_solar_gains");
  assert.equal(monthlyProfiles.find((profile) => profile.month === "july").coolingOutdoorTemperatureC, 32);

  const oriented = climateProfileToBuildingMonthlyProfiles(selection.profile, { solarOrientation: "north" });
  assert.equal(oriented.monthlyProfiles[0].solarOrientation, "north");
  assert.equal(oriented.monthlyProfiles[0].solarGainsKwh, 3.5);
  assert.equal(oriented.monthlyProfiles[0].solarGainsSource, "monthly_record_orientation_solar_gains");
});

test("climate profile validation enforces stable calendar month order", () => {
  const profile = createSyntheticSeasonalDemoClimateProfile();
  const mayIndex = profile.monthlyRecords.findIndex((record) => record.month === "may");
  const juneIndex = profile.monthlyRecords.findIndex((record) => record.month === "june");
  const swapped = profile.monthlyRecords[mayIndex];
  profile.monthlyRecords[mayIndex] = profile.monthlyRecords[juneIndex];
  profile.monthlyRecords[juneIndex] = swapped;

  assert.equal(validateClimateProfile(profile).ok, false);
  assert.equal(validateClimateProfile(profile).code, "climate_profile_month_order_mismatch");
});

test("synthetic climate profile has executable seasonal sanity metadata", () => {
  const sanity = analyzeClimateProfileSeasonality(createSyntheticSeasonalDemoClimateProfile());

  assert.equal(sanity.status, "ready");
  assert.equal(sanity.diagnostics.warnings.length, 0);
  assert.equal(sanity.checks.canonicalMonthOrder, true);
  assert.equal(sanity.checks.winterHeatingOutdoorAverageC < sanity.checks.summerHeatingOutdoorAverageC, true);
  assert.equal(sanity.checks.summerCoolingOutdoorSumC > sanity.checks.shoulderCoolingOutdoorSumC, true);
  assert.equal(sanity.checks.januarySouthSolarKwh, 10);
  assert.equal(sanity.checks.januaryNorthSolarKwh, 3.5);
  assert.equal(sanity.checks.julySouthSolarKwh, 520);
  assert.equal(sanity.checks.julyNorthSolarKwh, 182);
});

test("monthly useful-demand seasonality flags shoulder-only cooling anomalies", () => {
  const anomalous = analyzeMonthlyUsefulDemandSeasonality([
    { month: "may", qCndKwh: 2 },
    { month: "june", qCndKwh: 0 },
    { month: "july", qCndKwh: 0 },
    { month: "august", qCndKwh: 0 },
    { month: "october", qCndKwh: 1 }
  ]);
  const repaired = analyzeMonthlyUsefulDemandSeasonality([
    { month: "may", qCndKwh: 0 },
    { month: "june", qCndKwh: 10 },
    { month: "july", qCndKwh: 20 },
    { month: "august", qCndKwh: 15 },
    { month: "october", qCndKwh: 0 }
  ]);

  assert.equal(anomalous.diagnostics.warnings[0].code, "anomalous_monthly_cooling_distribution_requires_review");
  assert.equal(repaired.diagnostics.warnings.length, 0);
});

test("synthetic orientation solar ordering is explicit for north east south and west", () => {
  const profile = createSyntheticSeasonalDemoClimateProfile();
  const directions = Object.fromEntries(["north", "east", "south", "west"].map((orientation) => [
    orientation,
    climateProfileToBuildingMonthlyProfiles(profile, { solarOrientation: orientation }).monthlyProfiles
  ]));

  assert.equal(directions.north.find((month) => month.month === "january").solarGainsKwh, 3.5);
  assert.equal(directions.east.find((month) => month.month === "january").solarGainsKwh, 7);
  assert.equal(directions.south.find((month) => month.month === "january").solarGainsKwh, 10);
  assert.equal(directions.west.find((month) => month.month === "january").solarGainsKwh, 7);
  assert.equal(directions.north.find((month) => month.month === "july").solarGainsKwh, 182);
  assert.equal(directions.east.find((month) => month.month === "july").solarGainsKwh, 364);
  assert.equal(directions.south.find((month) => month.month === "july").solarGainsKwh, 520);
  assert.equal(directions.west.find((month) => month.month === "july").solarGainsKwh, 364);
  assert.equal(directions.south.find((month) => month.month === "january").solarGainsKwh > directions.north.find((month) => month.month === "january").solarGainsKwh, true);
  assert.equal(directions.south.find((month) => month.month === "july").solarGainsKwh > directions.north.find((month) => month.month === "july").solarGainsKwh, true);

  const romanianSouth = climateProfileToBuildingMonthlyProfiles(profile, { solarOrientation: "sud" });
  const romanianNorth = climateProfileToBuildingMonthlyProfiles(profile, { solarOrientation: "nord" });
  assert.equal(romanianSouth.monthlyProfiles[0].solarOrientation, "south");
  assert.equal(romanianSouth.monthlyProfiles[0].solarGainsKwh, 10);
  assert.equal(romanianNorth.monthlyProfiles[0].solarOrientation, "north");
  assert.equal(romanianNorth.monthlyProfiles[0].solarGainsKwh, 3.5);
});

test("explicit professional climate profile is accepted for verified calculation contracts", () => {
  const explicitProfile = createSyntheticSeasonalDemoClimateProfile();
  explicitProfile.profileId = "professional_profile_complete_12_months";
  explicitProfile.sourceType = "explicit_professional_climate_profile";
  explicitProfile.origin = "measured";
  explicitProfile.verificationStatus = "professional_supplied";
  explicitProfile.confirmationStatus = "confirmed_by_professional";
  explicitProfile.confidence = "high";

  const result = resolveClimateProfileSelection({ explicitProfile });
  assert.equal(result.status, "ready");
  assert.equal(result.calculationMode, "explicit_professional_climate_profile");
  assert.equal(result.profile.profileId, "professional_profile_complete_12_months");
});
