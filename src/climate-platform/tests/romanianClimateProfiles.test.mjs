import assert from "node:assert/strict";
import {
  CLIMATE_PLATFORM_VERSION,
  CLIMATE_SOURCE_CONTRACTS,
  MONTH_IDS,
  ROMANIAN_CLIMATE_PROFILES,
  ROMANIAN_CLIMATE_SOURCE_AUDIT,
  climateProfileToBuildingMonthlyProfiles,
  createSyntheticSeasonalDemoClimateProfile,
  findRomanianClimateProfileById,
  listRomanianClimateProfiles,
  resolveClimateProfileSelection,
  searchRomanianClimateProfiles,
  validateClimateProfile
} from "../index.mjs";

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

test("Romanian climate source audit distinguishes missing official data from legacy estimates", () => {
  assert.equal(ROMANIAN_CLIMATE_SOURCE_AUDIT.auditId, "P2D_ROMANIAN_CLIMATE_SOURCE_AUDIT_V1");
  assert.equal(
    ROMANIAN_CLIMATE_SOURCE_AUDIT.localExtractionNote,
    "docs/mc001-extraction/17_climate_annex.md"
  );
  assert.match(ROMANIAN_CLIMATE_SOURCE_AUDIT.conclusion, /does not contain an official Romanian locality/);
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
  assert.equal(demo.monthlyRecords.find((record) => record.month === "september").internalGainsKwh, 70);
  assert.equal(demo.monthlyRecords.find((record) => record.month === "september").solarGainsKwh, 150);
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
  assert.equal(monthlyProfiles.find((profile) => profile.month === "july").coolingOutdoorTemperatureC, 33);

  const oriented = climateProfileToBuildingMonthlyProfiles(selection.profile, { solarOrientation: "north" });
  assert.equal(oriented.monthlyProfiles[0].solarOrientation, "north");
  assert.equal(oriented.monthlyProfiles[0].solarGainsKwh, 3.5);
  assert.equal(oriented.monthlyProfiles[0].solarGainsSource, "monthly_record_orientation_solar_gains");
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
