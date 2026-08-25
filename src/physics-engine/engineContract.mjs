export const ENGINE_INPUT_SCHEMA_VERSION = "lacurent_engine_input_v1";
export const ENGINE_OUTPUT_SCHEMA_VERSION = "lacurent_engine_output_v1";

const UI_STATE_KEYS = new Set([
  "activeTab",
  "currentStep",
  "formState",
  "inspectorOpen",
  "stepValidation",
  "wizard",
  "workspaceUi"
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function sourceBackedSolarBlocked(buildingDna = {}) {
  return (buildingDna.monthlyProfiles ?? []).some(profile =>
    profile?.heatGains?.solarGainsSource ===
      "provider_climate_profile_without_qsol_preprocessing"
  );
}

function monthlyClimate(buildingDna = {}) {
  return (buildingDna.monthlyProfiles ?? []).map(profile => ({
    month: profile.month,
    durationHours: profile.transmission?.heating?.duration?.amount ??
      profile.transmission?.cooling?.duration?.amount ??
      null,
    outdoorTemperatureC: profile.transmission?.heating?.outdoorTemperature?.amount ??
      profile.transmission?.cooling?.outdoorTemperature?.amount ??
      null,
    hsolKwhPerM2ByOrientation:
      buildingDna.climateProvider?.datasets?.monthlyHsolVerticalHorizontal
        ?.monthlyRecords?.find(record => record.month === profile.month)
        ?.hsolKwhPerM2ByOrientation ?? null,
    solarGainPreprocessingStatus:
      profile?.heatGains?.solarGainsSource ===
        "provider_climate_profile_without_qsol_preprocessing"
        ? "blocked_qsky"
        : "available_or_explicit"
  }));
}

function renewablesContract(buildingDna = {}) {
  const renewables = buildingDna.renewables ?? buildingDna.renewableSystems ?? {};
  const workspacePv = buildingDna.projectWorkspace?.renewables?.photovoltaic;
  return {
    ...deepClone(renewables),
    ...(workspacePv && !renewables.photovoltaic
      ? { photovoltaic: deepClone(workspacePv) }
      : {})
  };
}

export function buildPhysicsEngineInputFromBuildingDna(buildingDna = {}, options = {}) {
  return {
    schemaVersion: ENGINE_INPUT_SCHEMA_VERSION,
    building: {
      buildingId: buildingDna.building?.buildingId ?? buildingDna.buildingId ?? null,
      type: buildingDna.building?.buildingType ?? buildingDna.buildingType ?? null,
      useCategory: buildingDna.building?.useCategory ?? null,
      geometry: deepClone(buildingDna.geometry ?? {}),
      location: deepClone(buildingDna.building?.location ?? buildingDna.location ?? {})
    },
    climate: {
      provider: deepClone(buildingDna.climateProvider ?? null),
      productionProfile: deepClone(buildingDna.productionClimateProfile ?? null),
      monthly: monthlyClimate(buildingDna),
      solarGainPreprocessingStatus: sourceBackedSolarBlocked(buildingDna)
        ? "blocked_qsky"
        : "available_or_explicit"
    },
    envelope: {
      assemblies: deepClone(buildingDna.assemblies ?? []),
      elements: deepClone(buildingDna.envelopeElements ?? []),
      thermalBridges: deepClone(buildingDna.thermalBridges ?? [])
    },
    use: {
      buildingSpecificParameters: deepClone(buildingDna.buildingSpecificParameters ?? {}),
      monthlyProfiles: deepClone(buildingDna.monthlyProfiles ?? [])
    },
    systems: deepClone(buildingDna.technicalSystems ?? {}),
    renewables: renewablesContract(buildingDna),
    calculationOptions: {
      inputDialect: "building_dna_v1",
      engineMode: options.engineMode ?? "javascript",
      preserveSolarBlocker: true,
      requestedAt: options.requestedAt ?? null
    }
  };
}

export function assertNoUiStateInEngineInput(engineInput) {
  const findings = [];
  function visit(value, path = "$") {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (UI_STATE_KEYS.has(key)) findings.push(childPath);
      visit(child, childPath);
    }
  }
  visit(engineInput);
  return {
    ok: findings.length === 0,
    findings
  };
}

export function normalizePhysicsEngineOutputContract(result = {}, engine = "javascript") {
  return {
    schemaVersion: ENGINE_OUTPUT_SCHEMA_VERSION,
    engine,
    status: result.status ?? "unknown",
    chapter2: result.chapter2Result ?? result.chapter2 ?? null,
    chapter3: result.chapter3Result ?? result.chapter3 ?? null,
    chapter4: result.chapter4Result ?? result.chapter4 ?? null,
    energyCarriers:
      result.chapter3Result?.energyByCarrier ??
      result.energyCarriers ??
      {},
    diagnostics: result.diagnostics ?? {},
    executionTrace:
      result.chapter2Result?.formulaReferences ??
      result.executionTrace ??
      []
  };
}
