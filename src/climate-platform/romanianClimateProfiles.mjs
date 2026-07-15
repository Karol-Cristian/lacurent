export const CLIMATE_PLATFORM_VERSION = "romanian_climate_platform_p2d_v1";

export const MONTH_IDS = Object.freeze([
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
]);

export const CALENDAR_MONTHLY_HOURS = Object.freeze({
  january: 744,
  february: 672,
  march: 744,
  april: 720,
  may: 744,
  june: 720,
  july: 744,
  august: 744,
  september: 720,
  october: 744,
  november: 720,
  december: 744
});

export const SOLAR_ORIENTATIONS = Object.freeze([
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "horizontal"
]);

export const ROMANIAN_CLIMATE_SOURCE_AUDIT = Object.freeze({
  auditId: "P2D_ROMANIAN_CLIMATE_SOURCE_AUDIT_V1",
  localMc001Pdf: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
  localExtractionNote: "docs/mc001-extraction/17_climate_annex.md",
  conclusion:
    "The repository does not contain an official Romanian locality/monthly climate dataset. MC001 Chapter 2 formulas require monthly climate and solar values but the local extraction marks those tables as blocked_missing_climate_dataset.",
  existingRepositoryData: Object.freeze([
    Object.freeze({
      path: "src/features/energy/physics/registries/climate.registry.ts",
      status: "legacy_internal_estimate_not_verified_for_production",
      productionUse: false
    }),
    Object.freeze({
      path: "src/features/energy/physics/registries/monthlyClimate.registry.ts",
      status: "legacy_internal_estimate_not_verified_for_production",
      productionUse: false
    }),
    Object.freeze({
      path: "docs/mc001-extraction/17_climate_annex.md",
      status: "authoritative_missing_dataset_contract",
      productionUse: true
    })
  ]),
  requiredExternalSources: Object.freeze([
    Object.freeze({
      sourceId: "official_romanian_monthly_climate_dataset",
      requiredFor: Object.freeze([
        "monthly exterior temperature",
        "annual exterior temperature for ground term",
        "locality/county/climate-zone mapping"
      ]),
      status: "not_available_in_repository"
    }),
    Object.freeze({
      sourceId: "official_monthly_solar_irradiation_dataset",
      requiredFor: Object.freeze([
        "Hsol for transparent elements",
        "Hsol for opaque elements",
        "orientation and tilt irradiation lookup"
      ]),
      status: "not_available_in_repository"
    })
  ])
});

export const CLIMATE_SOURCE_CONTRACTS = Object.freeze([
  Object.freeze({
    contractId: "romanian_normative_climate_catalogue",
    status: "external_normative_dependency_with_explicit_contract",
    verificationStatus: "not_available_in_repository",
    allowedForVerifiedCalculation: false,
    sourceReference:
      "MC001 Chapter 2 monthly method requires locality/climate data; local repository does not include the official table."
  }),
  Object.freeze({
    contractId: "explicit_professional_climate_profile",
    status: "explicit_input_contract",
    verificationStatus: "professional_supplied",
    allowedForVerifiedCalculation: true,
    sourceReference:
      "Professional supplies all twelve monthly records with source/provenance."
  }),
  Object.freeze({
    contractId: "synthetic_demo_profile",
    status: "synthetic_demo_contract",
    verificationStatus: "synthetic_demo_not_normative",
    allowedForVerifiedCalculation: false,
    sourceReference:
      "P2D synthetic seasonal profile for UI demonstration only; not an official climate dataset."
  })
]);

function orientationSolarGains(southValue) {
  return Object.freeze({
    north: Number((southValue * 0.35).toFixed(6)),
    northeast: Number((southValue * 0.55).toFixed(6)),
    east: Number((southValue * 0.7).toFixed(6)),
    southeast: Number((southValue * 0.9).toFixed(6)),
    south: southValue,
    southwest: Number((southValue * 0.9).toFixed(6)),
    west: Number((southValue * 0.7).toFixed(6)),
    northwest: Number((southValue * 0.55).toFixed(6)),
    horizontal: Number((southValue * 0.8).toFixed(6))
  });
}

const SYNTHETIC_DEMO_MONTHLY = Object.freeze([
  Object.freeze({ month: "january", outdoorTemperatureC: -1, internalGainsKwh: 10, solarGainsKwh: 10, coolingOutdoorTemperatureC: 25, solarGainsByOrientationKwh: orientationSolarGains(10) }),
  Object.freeze({ month: "february", outdoorTemperatureC: 1, internalGainsKwh: 15, solarGainsKwh: 15, coolingOutdoorTemperatureC: 25, solarGainsByOrientationKwh: orientationSolarGains(15) }),
  Object.freeze({ month: "march", outdoorTemperatureC: 7, internalGainsKwh: 20, solarGainsKwh: 20, coolingOutdoorTemperatureC: 25.5, solarGainsByOrientationKwh: orientationSolarGains(20) }),
  Object.freeze({ month: "april", outdoorTemperatureC: 12, internalGainsKwh: 40, solarGainsKwh: 50, coolingOutdoorTemperatureC: 26, solarGainsByOrientationKwh: orientationSolarGains(50) }),
  Object.freeze({ month: "may", outdoorTemperatureC: 17, internalGainsKwh: 35, solarGainsKwh: 30, coolingOutdoorTemperatureC: 25.5, solarGainsByOrientationKwh: orientationSolarGains(30) }),
  Object.freeze({ month: "june", outdoorTemperatureC: 19, internalGainsKwh: 90, solarGainsKwh: 320, coolingOutdoorTemperatureC: 30, solarGainsByOrientationKwh: orientationSolarGains(320) }),
  Object.freeze({ month: "july", outdoorTemperatureC: 19, internalGainsKwh: 100, solarGainsKwh: 520, coolingOutdoorTemperatureC: 32, solarGainsByOrientationKwh: orientationSolarGains(520) }),
  Object.freeze({ month: "august", outdoorTemperatureC: 19, internalGainsKwh: 100, solarGainsKwh: 460, coolingOutdoorTemperatureC: 31, solarGainsByOrientationKwh: orientationSolarGains(460) }),
  Object.freeze({ month: "september", outdoorTemperatureC: 18, internalGainsKwh: 75, solarGainsKwh: 220, coolingOutdoorTemperatureC: 28, solarGainsByOrientationKwh: orientationSolarGains(220) }),
  Object.freeze({ month: "october", outdoorTemperatureC: 12, internalGainsKwh: 30, solarGainsKwh: 15, coolingOutdoorTemperatureC: 25, solarGainsByOrientationKwh: orientationSolarGains(15) }),
  Object.freeze({ month: "november", outdoorTemperatureC: 6, internalGainsKwh: 20, solarGainsKwh: 20, coolingOutdoorTemperatureC: 25, solarGainsByOrientationKwh: orientationSolarGains(20) }),
  Object.freeze({ month: "december", outdoorTemperatureC: 1, internalGainsKwh: 10, solarGainsKwh: 10, coolingOutdoorTemperatureC: 25, solarGainsByOrientationKwh: orientationSolarGains(10) })
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values) {
  const numbers = values.filter(isFiniteNumber);
  return numbers.length === 0
    ? null
    : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function sum(values) {
  return values.filter(isFiniteNumber).reduce((total, value) => total + value, 0);
}

function monthRecordMap(profile) {
  return new Map((profile?.monthlyRecords ?? []).map((record) => [record.month, record]));
}

function normalizeOrientation(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    n: "north",
    ne: "northeast",
    e: "east",
    se: "southeast",
    s: "south",
    sw: "southwest",
    w: "west",
    nw: "northwest",
    nord: "north",
    nord_est: "northeast",
    est: "east",
    sud_est: "southeast",
    sud: "south",
    sud_vest: "southwest",
    vest: "west",
    nord_vest: "northwest"
  };
  const direction = aliases[normalized] ?? normalized;
  return SOLAR_ORIENTATIONS.includes(direction) ? direction : null;
}

function selectSolarOrientation(options = {}) {
  for (const candidate of [options.solarOrientation, options.windowOrientation, options.mainOrientation]) {
    const orientation = normalizeOrientation(candidate);
    if (orientation !== null) return orientation;
  }
  return null;
}

function profileSource(profile) {
  return {
    origin: profile.origin,
    profileId: profile.profileId,
    sourceType: profile.sourceType,
    reference: profile.sourceReferences?.[0] ?? profile.profileId,
    confidence: profile.confidence,
    confirmationStatus: profile.confirmationStatus,
    verificationStatus: profile.verificationStatus,
    editable: true
  };
}

export const ROMANIAN_CLIMATE_PROFILES = Object.freeze([
  Object.freeze({
    schema: "climate_profile_v1",
    profileId: "ro_synthetic_bucharest_seasonal_demo_v1",
    displayName: "Bucuresti - profil sintetic demonstrativ",
    country: "Romania",
    locality: "Bucuresti",
    county: "Bucuresti",
    climaticZone: "synthetic_demo_bucharest",
    sourceType: "synthetic_demo_profile",
    origin: "synthetic_demo_profile",
    normativeStatus: "not_normative",
    verificationStatus: "synthetic_demo_not_verified",
    confidence: "low",
    datasetVersion: CLIMATE_PLATFORM_VERSION,
    confirmationStatus: "unconfirmed_demo",
    sourceReferences: Object.freeze([
      "P2D.synthetic_seasonal_profile.ui_demonstration_only",
      "docs/mc001-extraction/17_climate_annex.md#Allowed-interim-behavior"
    ]),
    safetyLabel:
      "Profil climatic sintetic pentru demonstratie. Rezultatele nu reprezinta un calcul climatic normativ pentru o localitate reala.",
    applicability: "UI demonstration and reference-flow smoke only; not verified MC001 climate data.",
    monthlyRecords: Object.freeze(SYNTHETIC_DEMO_MONTHLY.map((entry) => Object.freeze({
      month: entry.month,
      durationHours: CALENDAR_MONTHLY_HOURS[entry.month],
      heatingOutdoorTemperatureC: entry.outdoorTemperatureC,
      coolingOutdoorTemperatureC: entry.coolingOutdoorTemperatureC,
      internalGainsKwh: entry.internalGainsKwh,
      solarGainsKwh: entry.solarGainsKwh,
      solarGainsByOrientationKwh: entry.solarGainsByOrientationKwh,
      ventilationAirHeatCapacityJPerM3K: 1200,
      ventilationAirFlowRateM3PerS: 0.016666666666666666,
      monthlyDataSource: "synthetic_seasonal_demo_profile_not_normative"
    })))
  })
]);

export function listClimateSourceContracts() {
  return CLIMATE_SOURCE_CONTRACTS;
}

export function listRomanianClimateProfiles({ includeSynthetic = true } = {}) {
  return ROMANIAN_CLIMATE_PROFILES.filter((profile) => (
    includeSynthetic || profile.sourceType !== "synthetic_demo_profile"
  )).map(deepClone);
}

export function findRomanianClimateProfileById(profileId) {
  const profile = ROMANIAN_CLIMATE_PROFILES.find((entry) => entry.profileId === profileId);
  return profile ? deepClone(profile) : null;
}

export function searchRomanianClimateProfiles(query = "", options = {}) {
  const normalized = String(query).trim().toLowerCase();
  return listRomanianClimateProfiles(options).filter((profile) => {
    if (!normalized) return true;
    return [
      profile.profileId,
      profile.displayName,
      profile.locality,
      profile.county,
      profile.climaticZone
    ].some((value) => String(value ?? "").toLowerCase().includes(normalized));
  });
}

export function validateClimateProfile(profile) {
  if (!profile || profile.schema !== "climate_profile_v1") {
    return { ok: false, code: "invalid_climate_profile_schema" };
  }
  if (typeof profile.profileId !== "string" || profile.profileId.length === 0) {
    return { ok: false, code: "missing_climate_profile_id" };
  }
  if (!Array.isArray(profile.monthlyRecords) || profile.monthlyRecords.length !== 12) {
    return { ok: false, code: "climate_profile_requires_twelve_months" };
  }
  const seen = new Set();
  for (const [index, record] of profile.monthlyRecords.entries()) {
    if (!MONTH_IDS.includes(record.month) || seen.has(record.month)) {
      return { ok: false, code: "climate_profile_invalid_or_duplicate_month" };
    }
    if (record.month !== MONTH_IDS[index]) {
      return { ok: false, code: "climate_profile_month_order_mismatch" };
    }
    seen.add(record.month);
    for (const key of [
      "durationHours",
      "heatingOutdoorTemperatureC",
      "coolingOutdoorTemperatureC",
      "internalGainsKwh",
      "solarGainsKwh",
      "ventilationAirHeatCapacityJPerM3K",
      "ventilationAirFlowRateM3PerS"
    ]) {
      if (!isFiniteNumber(record[key])) {
        return { ok: false, code: `climate_profile_invalid_${key}` };
      }
    }
    if (record.durationHours <= 0 || record.ventilationAirHeatCapacityJPerM3K <= 0) {
      return { ok: false, code: "climate_profile_invalid_positive_monthly_value" };
    }
    if (
      record.internalGainsKwh < 0 ||
      record.solarGainsKwh < 0 ||
      record.ventilationAirFlowRateM3PerS < 0
    ) {
      return { ok: false, code: "climate_profile_invalid_non_negative_monthly_value" };
    }
    if (record.solarGainsByOrientationKwh !== undefined) {
      if (typeof record.solarGainsByOrientationKwh !== "object" || Array.isArray(record.solarGainsByOrientationKwh)) {
        return { ok: false, code: "climate_profile_invalid_orientation_solar_gains" };
      }
      for (const orientation of Object.keys(record.solarGainsByOrientationKwh)) {
        if (
          !SOLAR_ORIENTATIONS.includes(orientation) ||
          !isFiniteNumber(record.solarGainsByOrientationKwh[orientation]) ||
          record.solarGainsByOrientationKwh[orientation] < 0
        ) {
          return { ok: false, code: "climate_profile_invalid_orientation_solar_gains" };
        }
      }
    }
  }
  return { ok: true };
}

export function analyzeClimateProfileSeasonality(profile) {
  const validation = validateClimateProfile(profile);
  if (!validation.ok) {
    return {
      status: "blocked",
      code: validation.code,
      profileId: profile?.profileId ?? null,
      checks: {},
      diagnostics: {
        blockers: [{ code: validation.code, severity: "blocking" }],
        warnings: []
      }
    };
  }

  const byMonth = monthRecordMap(profile);
  const winter = ["december", "january", "february"].map((month) => byMonth.get(month));
  const summer = ["june", "july", "august"].map((month) => byMonth.get(month));
  const shoulderCooling = sum(["may", "october"].map((month) => byMonth.get(month)?.coolingOutdoorTemperatureC));
  const summerCooling = sum(summer.map((record) => record?.coolingOutdoorTemperatureC));
  const warnings = [];
  const checks = {
    canonicalMonthOrder: profile.monthlyRecords.every((record, index) => record.month === MONTH_IDS[index]),
    winterHeatingOutdoorAverageC: average(winter.map((record) => record?.heatingOutdoorTemperatureC)),
    summerHeatingOutdoorAverageC: average(summer.map((record) => record?.heatingOutdoorTemperatureC)),
    shoulderCoolingOutdoorSumC: shoulderCooling,
    summerCoolingOutdoorSumC: summerCooling,
    januarySouthSolarKwh: byMonth.get("january")?.solarGainsByOrientationKwh?.south ?? null,
    januaryNorthSolarKwh: byMonth.get("january")?.solarGainsByOrientationKwh?.north ?? null,
    julySouthSolarKwh: byMonth.get("july")?.solarGainsByOrientationKwh?.south ?? null,
    julyNorthSolarKwh: byMonth.get("july")?.solarGainsByOrientationKwh?.north ?? null
  };

  if (!(checks.winterHeatingOutdoorAverageC < checks.summerHeatingOutdoorAverageC)) {
    warnings.push({ code: "seasonal_heating_temperatures_require_review", severity: "warning" });
  }
  if (!(checks.summerCoolingOutdoorSumC > shoulderCooling)) {
    warnings.push({ code: "seasonal_cooling_temperatures_require_review", severity: "warning" });
  }
  for (const month of ["january", "july"]) {
    const solar = byMonth.get(month)?.solarGainsByOrientationKwh;
    if (solar && !(solar.south > solar.north)) {
      warnings.push({
        code: "orientation_solar_ordering_requires_review",
        severity: "warning",
        month
      });
    }
  }

  return {
    status: "ready",
    profileId: profile.profileId,
    checks,
    diagnostics: {
      blockers: [],
      warnings
    }
  };
}

export function analyzeMonthlyUsefulDemandSeasonality(monthlyRows = []) {
  const byMonth = new Map(monthlyRows.map((row) => [row.month, row]));
  const qCnd = (month) => byMonth.get(month)?.qCndKwh ?? 0;
  const summerCooling = sum(["june", "july", "august"].map(qCnd));
  const shoulderCooling = sum(["may", "october"].map(qCnd));
  const warnings = [];
  if (shoulderCooling > 0 && summerCooling === 0) {
    warnings.push({
      code: "anomalous_monthly_cooling_distribution_requires_review",
      severity: "warning"
    });
  }
  return {
    status: "ready",
    checks: {
      summerCoolingKwh: summerCooling,
      shoulderCoolingKwh: shoulderCooling
    },
    diagnostics: {
      blockers: [],
      warnings
    }
  };
}

export function climateProfileToBuildingMonthlyProfiles(profile, options = {}) {
  const validation = validateClimateProfile(profile);
  if (!validation.ok) {
    return {
      status: "blocked",
      code: validation.code,
      monthlyProfiles: []
    };
  }
  const source = profileSource(profile);
  const solarOrientation = selectSolarOrientation(options);
  return {
    status: "ready",
    monthlyProfiles: profile.monthlyRecords.map((record) => {
      const orientedSolarGains = solarOrientation === null
        ? undefined
        : record.solarGainsByOrientationKwh?.[solarOrientation];
      return {
        month: record.month,
        heatingIndoorTemperatureC: options.heatingIndoorTemperatureC ?? 20,
        heatingOutdoorTemperatureC: record.heatingOutdoorTemperatureC,
        coolingIndoorTemperatureC: options.coolingIndoorTemperatureC ?? 24,
        coolingOutdoorTemperatureC: record.coolingOutdoorTemperatureC,
        durationHours: record.durationHours,
        ventilationAirHeatCapacityJPerM3K: record.ventilationAirHeatCapacityJPerM3K,
        ventilationAirFlowRateM3PerS: record.ventilationAirFlowRateM3PerS,
        internalGainsKwh: record.internalGainsKwh,
        solarGainsKwh: orientedSolarGains ?? record.solarGainsKwh,
        solarOrientation,
        solarGainsSource: orientedSolarGains === undefined
          ? "monthly_record_direct_solar_gains"
          : "monthly_record_orientation_solar_gains",
        provenance: {
          ...source,
          reference: `${source.reference}.${record.month}`,
          monthlyDataSource: record.monthlyDataSource,
          solarOrientation,
          solarGainsSource: orientedSolarGains === undefined
            ? "monthly_record_direct_solar_gains"
            : "monthly_record_orientation_solar_gains"
        }
      };
    }),
    climateProfile: deepClone(profile),
    source
  };
}

export function resolveClimateProfileSelection({
  profileId,
  explicitProfile,
  allowSynthetic = false
} = {}) {
  if (explicitProfile) {
    const validation = validateClimateProfile(explicitProfile);
    if (!validation.ok) {
      return { status: "blocked", code: validation.code };
    }
    if (explicitProfile.sourceType === "synthetic_demo_profile" && !allowSynthetic) {
      return { status: "blocked", code: "synthetic_climate_profile_requires_demo_or_explicit_estimated_mode" };
    }
    return {
      status: "ready",
      profile: deepClone(explicitProfile),
      calculationMode: explicitProfile.sourceType === "synthetic_demo_profile"
        ? "synthetic_demo"
        : "explicit_professional_climate_profile"
    };
  }
  if (!profileId) {
    return { status: "blocked", code: "missing_climate_profile_selection" };
  }
  const profile = findRomanianClimateProfileById(profileId);
  if (!profile) {
    return { status: "blocked", code: "unsupported_climate_profile_id" };
  }
  if (profile.sourceType === "synthetic_demo_profile" && !allowSynthetic) {
    return { status: "blocked", code: "synthetic_climate_profile_requires_demo_or_explicit_estimated_mode" };
  }
  return {
    status: "ready",
    profile,
    calculationMode: profile.sourceType === "synthetic_demo_profile"
      ? "synthetic_demo"
      : "verified_input_ready"
  };
}

export function createSyntheticSeasonalDemoClimateProfile() {
  return findRomanianClimateProfileById("ro_synthetic_bucharest_seasonal_demo_v1");
}

export function createSyntheticSeasonalDemoMonthlyProfiles(options = {}) {
  return climateProfileToBuildingMonthlyProfiles(
    createSyntheticSeasonalDemoClimateProfile(),
    options
  );
}
