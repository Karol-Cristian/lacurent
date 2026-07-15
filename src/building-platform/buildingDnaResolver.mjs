import {
  BUILDING_PLATFORM_VERSION,
  getAssemblyCatalogueEntry,
  getMaterialCatalogueEntry,
  makeEngineeringProvenance,
  makeEngineeringQuantity
} from "./buildingPlatformCatalog.mjs";
import {
  createAssistedTypologyInput,
  proposeBuildingTypology,
  validateTypologyProposal
} from "./buildingTypologyEngine.mjs";
import { resolveBuildingRenovationInterventions } from "./buildingRenovationInterventions.mjs";
import {
  climateProfileToBuildingMonthlyProfiles,
  resolveClimateProfileSelection
} from "../climate-platform/index.mjs";

const ASSISTED_MODE = "assisted";
const ADVANCED_MODE = "advanced";
const RESOLVER_SCOPE = "building_dna_v1_engineering_model_no_physics_calculation";
const MONTHS = Object.freeze([
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function warning(code) {
  return { code, severity: "warning" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: RESOLVER_SCOPE,
    buildingDna: null,
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [
        "engineering_model_generation_only",
        "no_physics_calculation",
        "no_hidden_defaults",
        "not_chapter_3",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ]
    }
  };
}

function safeCode(value, maxLength = 128) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[a-zA-Z0-9_.:-]+$/.test(value);
}

function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function provenance(reference, confidence = "medium", origin = "proposed_by_typology", metadata = {}) {
  const {
    confirmationStatus,
    editable,
    notes,
    ...metadataRest
  } = metadata;
  return makeEngineeringProvenance({
    origin,
    reference,
    confidence,
    normativeReference:
      "P1 Building DNA explicit engineering value; Chapter 2 physics engine consumes it as input.",
    calculationSource: "resolver_model_generation_no_physics_calculation",
    confirmationRequired: origin !== "confirmed_by_user",
    ...(confirmationStatus === undefined ? {} : { confirmationStatus }),
    ...(editable === undefined ? {} : { editable }),
    ...(notes === undefined ? {} : { notes }),
    ...(Object.keys(metadataRest).length === 0 ? {} : { metadata: metadataRest })
  });
}

function q(amount, unit, reference, confidence = "medium", origin = "proposed_by_typology") {
  return makeEngineeringQuantity(amount, unit, provenance(reference, confidence, origin));
}

function sourceProvenance(source = {}) {
  if (source.origin !== "demo_fixture" && source.origin !== "synthetic_demo_profile") {
    return {
      origin: source.origin ?? "confirmed_by_user",
      confidence: source.confidence ?? "high",
      metadata: {
        ...(source.confirmationStatus === undefined ? {} : { confirmationStatus: source.confirmationStatus }),
        ...(source.editable === undefined ? {} : { editable: source.editable }),
        ...(source.profileId === undefined ? {} : { profileId: source.profileId }),
        ...(source.verificationStatus === undefined ? {} : { verificationStatus: source.verificationStatus })
      }
    };
  }
  return {
    origin: "demo_fixture",
    confidence: source.confidence ?? "medium",
    metadata: {
      confirmationStatus: source.confirmationStatus ?? "unconfirmed_demo",
      editable: source.editable ?? true,
      ...(source.profileId === undefined ? {} : { profileId: source.profileId }),
      ...(source.origin === undefined ? {} : { sourceOrigin: source.origin }),
      ...(source.verificationStatus === undefined ? {} : { verificationStatus: source.verificationStatus }),
      notes: source.origin === "synthetic_demo_profile"
        ? "Synthetic seasonal climate profile for demonstration only; editable and not a normative locality dataset."
        : "Prefilled demonstration value; editable and not a silent default for normal projects."
    }
  };
}

function parameterValue(value, unit, reference, source = {}) {
  const p = sourceProvenance(source);
  return {
    value,
    unit,
    provenance: provenance(reference, p.confidence, p.origin, p.metadata)
  };
}

function parameterText(value, reference, source = {}) {
  const p = sourceProvenance(source);
  return {
    value,
    provenance: provenance(reference, p.confidence, p.origin, p.metadata)
  };
}

function normalizeBuildingSpecificParameters(parameters = {}, source = {}) {
  const output = {};
  const ref = "P2.building_specific_parameters";
  for (const [key, unit] of [
    ["usefulFloorAreaM2", "m2"],
    ["heatedVolumeM3", "m3"],
    ["numberOfFloors", "count"],
    ["averageRoomHeightM", "m"],
    ["ventilationAch", "1/h"],
    ["windowAreaM2", "m2"],
    ["exteriorWallAreaM2", "m2"],
    ["roofAreaM2", "m2"],
    ["groundFloorAreaM2", "m2"],
    ["atticCeilingAreaM2", "m2"]
  ]) {
    const value = parameters?.[key];
    if (finitePositive(value)) {
      output[key] = parameterValue(value, unit, `${ref}.${key}`, source);
    }
  }
  for (const key of [
    "mainOrientation",
    "windowOrientation",
    "ventilationType",
    "atticContext",
    "basementContext"
  ]) {
    if (safeCode(parameters?.[key] ?? "", 96)) {
      output[key] = parameterText(parameters[key], `${ref}.${key}`, source);
    }
  }
  return output;
}

function geometryOverridesFromBuildingSpecificParameters(parameters = {}) {
  const overrides = {};
  const usefulArea = parameters.usefulFloorAreaM2;
  if (finitePositive(usefulArea)) {
    overrides.usefulFloorAreaM2 = usefulArea;
    overrides.groundFloorAreaM2 = parameters.groundFloorAreaM2 ?? usefulArea;
    overrides.roofAreaM2 = parameters.roofAreaM2 ?? usefulArea;
  }
  for (const key of [
    "windowAreaM2",
    "exteriorWallAreaM2",
    "groundFloorAreaM2",
    "roofAreaM2",
    "atticCeilingAreaM2"
  ]) {
    if (finitePositive(parameters[key])) {
      overrides[key] = parameters[key];
    }
  }
  return overrides;
}

function defaultGeometry(overrides = {}) {
  return {
    exteriorWallAreaM2: 50,
    roofAreaM2: 60,
    groundFloorAreaM2: 50,
    atticCeilingAreaM2: 40,
    windowAreaM2: 8,
    doorAreaM2: 2,
    adjacentWallAreaM2: 10,
    usefulFloorAreaM2: 120,
    ...overrides
  };
}

function resolveMonthlyProfileSelection({
  monthlyProfiles,
  climateProfile,
  climateProfileId,
  allowSyntheticClimate,
  solarOrientation,
  mainOrientation
} = {}) {
  if (Array.isArray(monthlyProfiles)) {
    return {
      status: "ready",
      monthlyProfiles,
      climateProfile: climateProfile ?? null,
      calculationMode: climateProfile?.sourceType === "synthetic_demo_profile"
        ? "synthetic_demo"
        : "explicit_monthly_profile"
    };
  }
  const selection = resolveClimateProfileSelection({
    profileId: climateProfileId,
    explicitProfile: climateProfile,
    allowSynthetic: allowSyntheticClimate === true
  });
  if (selection.status !== "ready") {
    return selection;
  }
  const converted = climateProfileToBuildingMonthlyProfiles(selection.profile, {
    solarOrientation,
    mainOrientation
  });
  if (converted.status !== "ready") {
    return converted;
  }
  return {
    status: "ready",
    monthlyProfiles: converted.monthlyProfiles,
    climateProfile: converted.climateProfile,
    calculationMode: selection.calculationMode
  };
}

function seedUtilizationDependencies() {
  return {
    effectiveInternalHeatCapacityJPerK: 25200000,
    deriveTotalHeatTransferCoefficientFromEnvelopeAndVentilation: true,
    aH0: 1,
    tauH0: 15,
    aC0: 1,
    tauC0: 15
  };
}

function seedBoundaryContext() {
  return {
    groundFloorBoundaryType: "ground",
    groundCorrectionFactor: 0.6,
    groundFloorBoundaryCorrectionFactor: 0.6,
    atticBoundaryType: "unheated_attic",
    atticBoundaryCorrectionFactor: 0.2,
    atticHeatTransferToExteriorWK: 35,
    atticTotalHeatTransferWK: 50,
    adjacentWallUValueWm2K: 0.5,
    adjacentWallBoundaryCorrectionFactor: 0.2,
    linearThermalBridges: [
      {
        bridgeId: "external-corners",
        component: "Hd",
        lengthM: 20,
        psiWPerMK: 0.04
      }
    ]
  };
}

function boundaryContextFromAssistedContext(context = {}) {
  const output = {};
  if (context.attic === "heated") {
    output.atticBoundaryType = "adjacent_heated_space";
  } else if (context.attic === "unheated") {
    output.atticBoundaryType = "unheated_attic";
  }
  if (context.basement === "heated") {
    output.groundFloorBoundaryType = "adjacent_heated_space";
    output.groundFloorBoundaryCorrectionFactor = 0.2;
  } else if (context.basement === "unheated") {
    output.groundFloorBoundaryType = "unheated_basement";
    output.groundFloorBoundaryCorrectionFactor = 0.6;
  } else if (context.basement === "none") {
    output.groundFloorBoundaryType = "ground";
  }
  return output;
}

function validateGeometry(geometry) {
  for (const key of [
    "exteriorWallAreaM2",
    "roofAreaM2",
    "groundFloorAreaM2",
    "atticCeilingAreaM2",
    "windowAreaM2",
    "doorAreaM2",
    "usefulFloorAreaM2"
  ]) {
    if (!finitePositive(geometry?.[key])) {
      return { ok: false, code: "missing_or_invalid_building_geometry" };
    }
  }
  if (
    geometry.adjacentWallAreaM2 !== undefined &&
    !finiteNonNegative(geometry.adjacentWallAreaM2)
  ) {
    return { ok: false, code: "missing_or_invalid_building_geometry" };
  }
  return { ok: true };
}

function validateMonthlyProfiles(monthlyProfiles) {
  if (!Array.isArray(monthlyProfiles) || monthlyProfiles.length !== 12) {
    return { ok: false, code: "missing_or_invalid_monthly_building_profile" };
  }
  const seen = new Set();
  for (const profile of monthlyProfiles) {
    if (!MONTHS.includes(profile.month) || seen.has(profile.month)) {
      return { ok: false, code: "missing_or_invalid_monthly_building_profile" };
    }
    seen.add(profile.month);
    for (const key of [
      "heatingIndoorTemperatureC",
      "heatingOutdoorTemperatureC",
      "coolingIndoorTemperatureC",
      "coolingOutdoorTemperatureC",
      "durationHours",
      "ventilationAirHeatCapacityJPerM3K",
      "ventilationAirFlowRateM3PerS",
      "internalGainsKwh",
      "solarGainsKwh"
    ]) {
      if (typeof profile[key] !== "number" || !Number.isFinite(profile[key])) {
        return { ok: false, code: "missing_or_invalid_monthly_building_profile" };
      }
    }
    if (profile.durationHours <= 0 || profile.ventilationAirHeatCapacityJPerM3K <= 0) {
      return { ok: false, code: "missing_or_invalid_monthly_building_profile" };
    }
    if (
      profile.ventilationAirFlowRateM3PerS < 0 ||
      profile.internalGainsKwh < 0 ||
      profile.solarGainsKwh < 0
    ) {
      return { ok: false, code: "missing_or_invalid_monthly_building_profile" };
    }
  }
  return { ok: true };
}

function resolveAssembly(selectionId, role) {
  const assembly = getAssemblyCatalogueEntry(selectionId);
  if (assembly === null) {
    return { ok: false, code: "building_dna_unknown_assembly_selection" };
  }
  const layers = [];
  for (const layer of assembly.layers ?? []) {
    const material = getMaterialCatalogueEntry(layer.materialId);
    if (material === null) {
      return { ok: false, code: "building_dna_unknown_material_selection" };
    }
    layers.push({
      layerId: layer.layerId,
      materialId: layer.materialId,
      material,
      thickness: layer.thickness,
      provenance: layer.thickness.provenance
    });
  }
  return {
    ok: true,
    value: {
      assemblyId: assembly.assemblyId,
      assemblyRole: role,
      displayName: assembly.displayName,
      assemblyType: assembly.assemblyType,
      layers,
      ...(assembly.directUValue === undefined ? {} : { directUValue: assembly.directUValue }),
      ...(assembly.surfaceResistances === undefined
        ? {}
        : { surfaceResistances: assembly.surfaceResistances }),
      provenance: assembly.provenance
    }
  };
}

function buildAssemblies(assemblySelections) {
  const mapping = {
    exteriorWall: "exterior_wall",
    roof: "roof",
    groundFloor: "ground_floor",
    atticCeiling: "attic_ceiling",
    window: "window",
    door: "door"
  };
  const assemblies = [];
  for (const [selectionKey, role] of Object.entries(mapping)) {
    const selection = assemblySelections?.[selectionKey];
    if (!safeCode(selection)) {
      return { ok: false, code: "building_dna_missing_assembly_selection" };
    }
    const resolved = resolveAssembly(selection, role);
    if (!resolved.ok) {
      return resolved;
    }
    assemblies.push(resolved.value);
  }
  return { ok: true, value: assemblies };
}

function makeEnvelopeElements(geometry, boundaryContext) {
  const elementSource = "P1.resolver.envelope";
  const groundBoundaryType = boundaryContext.groundFloorBoundaryType ?? "ground";
  const atticBoundaryType = boundaryContext.atticBoundaryType ?? "unheated_attic";
  const groundBoundaryCorrection = groundBoundaryType === "ground"
    ? {
        boundaryCorrectionFactor: q(
          boundaryContext.groundCorrectionFactor,
          "dimensionless",
          `${elementSource}.ground_floor.boundary_factor`,
          "low"
        )
      }
    : {
        boundaryCorrectionFactor: q(
          boundaryContext.groundFloorBoundaryCorrectionFactor,
          "dimensionless",
          `${elementSource}.ground_floor.boundary_factor`,
          "low"
        )
      };
  const atticBoundaryCorrection = atticBoundaryType === "unheated_attic"
    ? {
        boundaryCorrection: {
          mode: "bztu_explicit_heat_transfer_ratio_v1",
          heatTransferToExterior: q(
            boundaryContext.atticHeatTransferToExteriorWK,
            "W/K",
            `${elementSource}.attic.heat_transfer_to_exterior`,
            "low"
          ),
          totalHeatTransfer: q(
            boundaryContext.atticTotalHeatTransferWK,
            "W/K",
            `${elementSource}.attic.total_heat_transfer`,
            "low"
          )
        }
      }
    : {
        boundaryCorrectionFactor: q(
          boundaryContext.atticBoundaryCorrectionFactor,
          "dimensionless",
          `${elementSource}.attic.boundary_factor`,
          "low"
        )
      };
  const elements = [
    {
      elementId: "exterior-walls",
      elementType: "wall",
      assemblyRole: "exterior_wall",
      boundaryType: "outside_air",
      area: q(geometry.exteriorWallAreaM2, "m2", `${elementSource}.exterior_walls.area`)
    },
    {
      elementId: "roof",
      elementType: "roof",
      assemblyRole: "roof",
      boundaryType: "outside_air",
      area: q(geometry.roofAreaM2, "m2", `${elementSource}.roof.area`)
    },
    {
      elementId: "windows",
      elementType: "window",
      assemblyRole: "window",
      boundaryType: "outside_air",
      area: q(geometry.windowAreaM2, "m2", `${elementSource}.windows.area`)
    },
    {
      elementId: "front-door",
      elementType: "door",
      assemblyRole: "door",
      boundaryType: "outside_air",
      area: q(geometry.doorAreaM2, "m2", `${elementSource}.door.area`)
    },
    {
      elementId: "ground-floor",
      elementType: "floor",
      assemblyRole: "ground_floor",
      boundaryType: groundBoundaryType,
      area: q(geometry.groundFloorAreaM2, "m2", `${elementSource}.ground_floor.area`),
      ...groundBoundaryCorrection
    },
    {
      elementId: "attic-ceiling",
      elementType: "ceiling",
      assemblyRole: "attic_ceiling",
      boundaryType: atticBoundaryType,
      area: q(geometry.atticCeilingAreaM2, "m2", `${elementSource}.attic_ceiling.area`),
      ...atticBoundaryCorrection
    }
  ];

  if (geometry.adjacentWallAreaM2 > 0) {
    elements.push({
      elementId: "adjacent-wall",
      elementType: "wall",
      boundaryType: "adjacent_heated_space",
      uValue: q(
        boundaryContext.adjacentWallUValueWm2K,
        "W/(m2*K)",
        `${elementSource}.adjacent_wall.u_value`,
        "low"
      ),
      area: q(geometry.adjacentWallAreaM2, "m2", `${elementSource}.adjacent_wall.area`),
      boundaryCorrectionFactor: q(
        boundaryContext.adjacentWallBoundaryCorrectionFactor,
        "dimensionless",
        `${elementSource}.adjacent_wall.boundary_factor`,
        "low"
      )
    });
  }
  return elements;
}

function makeThermalBridges(boundaryContext) {
  return (boundaryContext.linearThermalBridges ?? []).map((bridge) => ({
    bridgeId: bridge.bridgeId,
    component: bridge.component,
    length: q(
      bridge.lengthM,
      "m",
      `P1.resolver.thermal_bridge.${bridge.bridgeId}.length`,
      "low"
    ),
    psi: q(
      bridge.psiWPerMK,
      "W/(m*K)",
      `P1.resolver.thermal_bridge.${bridge.bridgeId}.psi`,
      "low"
    )
  }));
}

function monthlyQuantity(profile, amount, unit, reference, confidence = "low") {
  const source = profile.provenance ?? {};
  return {
    amount,
    unit,
    provenance: provenance(
      reference,
      source.confidence ?? confidence,
      source.origin === "synthetic_demo_profile"
        ? "demo_fixture"
        : source.origin ?? "confirmed_by_user",
      {
        ...(source.profileId === undefined ? {} : { profileId: source.profileId }),
        ...(source.sourceType === undefined ? {} : { sourceType: source.sourceType }),
        ...(source.origin === undefined ? {} : { sourceOrigin: source.origin }),
        ...(source.verificationStatus === undefined ? {} : { verificationStatus: source.verificationStatus }),
        ...(source.confirmationStatus === undefined ? {} : { confirmationStatus: source.confirmationStatus }),
        ...(source.monthlyDataSource === undefined ? {} : { monthlyDataSource: source.monthlyDataSource }),
        ...(source.solarOrientation === undefined ? {} : { solarOrientation: source.solarOrientation }),
        ...(source.solarGainsSource === undefined ? {} : { solarGainsSource: source.solarGainsSource }),
        editable: source.editable ?? true
      }
    )
  };
}

function makeMonthlyProfile(profile) {
  const ref = `P1.resolver.monthly.${profile.month}`;
  const profileProvenance = profile.provenance === undefined
    ? provenance(ref, "low")
    : provenance(
        profile.provenance.reference ?? ref,
        profile.provenance.confidence ?? "low",
        profile.provenance.origin === "synthetic_demo_profile"
          ? "demo_fixture"
          : profile.provenance.origin ?? "confirmed_by_user",
        {
          ...(profile.provenance.profileId === undefined ? {} : { profileId: profile.provenance.profileId }),
          ...(profile.provenance.sourceType === undefined ? {} : { sourceType: profile.provenance.sourceType }),
          ...(profile.provenance.origin === undefined ? {} : { sourceOrigin: profile.provenance.origin }),
          ...(profile.provenance.verificationStatus === undefined ? {} : { verificationStatus: profile.provenance.verificationStatus }),
          ...(profile.provenance.confirmationStatus === undefined ? {} : { confirmationStatus: profile.provenance.confirmationStatus }),
          ...(profile.provenance.monthlyDataSource === undefined ? {} : { monthlyDataSource: profile.provenance.monthlyDataSource }),
          ...(profile.provenance.solarOrientation === undefined ? {} : { solarOrientation: profile.provenance.solarOrientation }),
          ...(profile.provenance.solarGainsSource === undefined ? {} : { solarGainsSource: profile.provenance.solarGainsSource }),
          editable: profile.provenance.editable ?? true
        }
      );
  return {
    month: profile.month,
    transmission: {
      heating: {
        indoorTemperature: monthlyQuantity(profile, profile.heatingIndoorTemperatureC, "degC", `${ref}.heating.indoor`, "low"),
        outdoorTemperature: monthlyQuantity(profile, profile.heatingOutdoorTemperatureC, "degC", `${ref}.heating.outdoor`, "low"),
        duration: monthlyQuantity(profile, profile.durationHours, "h", `${ref}.heating.duration`, "low")
      },
      cooling: {
        indoorTemperature: monthlyQuantity(profile, profile.coolingIndoorTemperatureC, "degC", `${ref}.cooling.indoor`, "low"),
        outdoorTemperature: monthlyQuantity(profile, profile.coolingOutdoorTemperatureC, "degC", `${ref}.cooling.outdoor`, "low"),
        duration: monthlyQuantity(profile, profile.durationHours, "h", `${ref}.cooling.duration`, "low")
      }
    },
    ventilation: {
      heating: {
        airHeatCapacity: monthlyQuantity(
          profile,
          profile.ventilationAirHeatCapacityJPerM3K,
          "J/(m3*K)",
          `${ref}.heating.air_heat_capacity`,
          "low"
        ),
        airFlowRate: monthlyQuantity(
          profile,
          profile.ventilationAirFlowRateM3PerS,
          "m3/s",
          `${ref}.heating.air_flow_rate`,
          "low"
        ),
        indoorTemperature: monthlyQuantity(profile, profile.heatingIndoorTemperatureC, "degC", `${ref}.heating.vent.indoor`, "low"),
        outdoorTemperature: monthlyQuantity(profile, profile.heatingOutdoorTemperatureC, "degC", `${ref}.heating.vent.outdoor`, "low"),
        duration: monthlyQuantity(profile, profile.durationHours, "h", `${ref}.heating.vent.duration`, "low")
      },
      cooling: {
        airHeatCapacity: monthlyQuantity(
          profile,
          profile.ventilationAirHeatCapacityJPerM3K,
          "J/(m3*K)",
          `${ref}.cooling.air_heat_capacity`,
          "low"
        ),
        airFlowRate: monthlyQuantity(
          profile,
          profile.ventilationAirFlowRateM3PerS,
          "m3/s",
          `${ref}.cooling.air_flow_rate`,
          "low"
        ),
        indoorTemperature: monthlyQuantity(profile, profile.coolingIndoorTemperatureC, "degC", `${ref}.cooling.vent.indoor`, "low"),
        outdoorTemperature: monthlyQuantity(profile, profile.coolingOutdoorTemperatureC, "degC", `${ref}.cooling.vent.outdoor`, "low"),
        duration: monthlyQuantity(profile, profile.durationHours, "h", `${ref}.cooling.vent.duration`, "low")
      }
    },
    heatGains: {
      internalGains: monthlyQuantity(profile, profile.internalGainsKwh, "kWh", `${ref}.internal_gains`, "low"),
      solarGains: monthlyQuantity(profile, profile.solarGainsKwh, "kWh", `${ref}.solar_gains`, "low"),
      solarOrientation: profile.solarOrientation ?? null,
      solarGainsSource: profile.solarGainsSource ?? "monthly_profile_solar_gains"
    },
    heating: {
      utilizationDependencies: seedUtilizationDependencies()
    },
    cooling: {
      utilizationDependencies: seedUtilizationDependencies(),
      aCred: 1
    },
    provenance: profileProvenance
  };
}

function resolveBuildingDna({
  userMode,
  source,
  typologyProposal,
  assemblySelections,
  geometry,
  buildingSpecificParameters,
  renovationInterventions,
  boundaryContext,
  climateProfile,
  calculationMode,
  monthlyProfiles,
  building
}) {
  if (userMode !== ASSISTED_MODE && userMode !== ADVANCED_MODE) {
    return blocked("building_dna_invalid_user_mode");
  }
  const selections = assemblySelections ?? typologyProposal?.assemblySelections;
  const assemblies = buildAssemblies(selections);
  if (!assemblies.ok) {
    return blocked(assemblies.code);
  }
  const geometryCheck = validateGeometry(geometry);
  if (!geometryCheck.ok) {
    return blocked(geometryCheck.code);
  }
  const monthlyCheck = validateMonthlyProfiles(monthlyProfiles);
  if (!monthlyCheck.ok) {
    return blocked(monthlyCheck.code);
  }
  if (!safeCode(source?.reference ?? "")) {
    return blocked("building_dna_missing_source_reference");
  }

  const resolvedBoundaryContext = {
    ...seedBoundaryContext(),
    ...(boundaryContext ?? {})
  };
  const dna = {
    schema: "building_dna_v1",
    platformVersion: BUILDING_PLATFORM_VERSION,
    scope: RESOLVER_SCOPE,
    userMode,
    source,
    building: {
      buildingId: building?.buildingId ?? "building-dna-p1",
      buildingType: building?.buildingType ?? typologyProposal?.buildingType ?? "detached_house",
      constructionPeriod: building?.constructionPeriod ?? typologyProposal?.constructionPeriod,
      structuralSystem: building?.structuralSystem ?? typologyProposal?.structuralSystem,
      location: building?.location ?? null
    },
    climateProfile: climateProfile == null ? null : {
      profileId: climateProfile.profileId,
      displayName: climateProfile.displayName,
      country: climateProfile.country,
      locality: climateProfile.locality,
      county: climateProfile.county,
      climaticZone: climateProfile.climaticZone,
      sourceType: climateProfile.sourceType,
      origin: climateProfile.origin,
      normativeStatus: climateProfile.normativeStatus,
      verificationStatus: climateProfile.verificationStatus,
      datasetVersion: climateProfile.datasetVersion,
      sourceReferences: climateProfile.sourceReferences,
      safetyLabel: climateProfile.safetyLabel ?? null
    },
    calculationStatus: calculationMode === "synthetic_demo"
      ? "synthetic_demo"
      : calculationMode === "explicit_professional_climate_profile"
        ? "estimated"
        : "requires_confirmation",
    typologyProposal: typologyProposal ?? null,
    buildingSpecificParameters: normalizeBuildingSpecificParameters(buildingSpecificParameters, source),
    renovationInterventions: deepClone(renovationInterventions ?? []),
    geometry: deepClone(geometry),
    assemblies: assemblies.value,
    envelopeElements: makeEnvelopeElements(geometry, resolvedBoundaryContext),
    thermalBridges: makeThermalBridges(resolvedBoundaryContext),
    monthlyProfiles: monthlyProfiles.map(makeMonthlyProfile),
    assumptions: [
      {
        assumptionId: "building_dna_contains_confirmable_engineering_assumptions",
        text:
          "Automatically selected assemblies, interventions, geometry seeds, and monthly profiles are explicit Building DNA values and remain editable.",
        provenance: provenance("P1.resolver.assumptions", "low")
      },
      {
        assumptionId: "building_specific_parameters_seed_geometry_until_confirmed",
        text:
          "User-facing geometry answers seed the engineering geometry for review and must be confirmed for verified calculations.",
        provenance: provenance("P2.resolver.building_specific_parameters", "low")
      }
    ].concat(source?.origin === "demo_fixture" ? [{
      assumptionId: "demo_fixture_values_are_unconfirmed_and_editable",
      text:
        "Demo mode prefilled this Building DNA from an explicit fixture. Values are editable and are not used as defaults for normal projects.",
      provenance: provenance(
        source.reference,
        source.confidence ?? "medium",
        "demo_fixture",
        {
          confirmationStatus: source.confirmationStatus ?? "unconfirmed_demo",
          editable: source.editable ?? true
        }
      )
    }] : []).concat(climateProfile?.sourceType === "synthetic_demo_profile" ? [{
      assumptionId: "synthetic_climate_profile_not_normative",
      text:
        "Profil climatic sintetic pentru demonstratie. Rezultatele nu reprezinta un calcul climatic normativ pentru o localitate reala.",
      provenance: provenance(
        climateProfile.profileId,
        "low",
        "demo_fixture",
        {
          profileId: climateProfile.profileId,
          sourceOrigin: "synthetic_demo_profile",
          verificationStatus: climateProfile.verificationStatus,
          confirmationStatus: "unconfirmed_demo",
          editable: true
        }
      )
    }] : []),
    warnings: [
      warning("building_dna_contains_unconfirmed_typology_proposals")
    ],
    missingConfirmations: typologyProposal?.missingConfirmations ?? [
      "confirm_engineering_model"
    ],
    overrides: [],
    demoFixture: source?.origin === "demo_fixture" ? {
      fixtureId: source.fixtureId ?? null,
      origin: "demo_fixture",
      confirmationStatus: source.confirmationStatus ?? "unconfirmed_demo",
      editable: source.editable ?? true,
      confidence: source.confidence ?? "medium"
    } : null,
    diagnostics: {
      blockers: [],
      methodologyLimits: [
        "engineering_model_generation_only",
        "no_physics_calculation",
        "no_hidden_defaults",
        "not_chapter_3",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ]
    }
  };
  return {
    status: "ready",
    scope: RESOLVER_SCOPE,
    buildingDna: dna,
    diagnostics: {
      blockers: [],
      warnings: dna.warnings,
      methodologyLimits: dna.diagnostics.methodologyLimits
    }
  };
}

export function createBuildingDnaFromAssistedAnswers(answers = {}) {
  const interventions = resolveBuildingRenovationInterventions({
    renovations: answers.renovations ?? {},
    source: answers.source ?? { reference: "P2.assisted_answers" }
  });
  const typology = proposeBuildingTypology(createAssistedTypologyInput({
    buildingType: answers.buildingType,
    constructionPeriod: answers.constructionPeriod,
    structuralSystem: answers.structuralSystem,
    wallMaterial: answers.wallMaterial,
    renovations: answers.renovations ?? {},
    context: answers.context ?? {}
  }));
  if (typology.status !== "ready") {
    return blocked(typology.diagnostics.blockers[0].code);
  }
  const validation = validateTypologyProposal(typology);
  if (!validation.ok) {
    return blocked(validation.code);
  }
  const monthlySelection = resolveMonthlyProfileSelection({
    monthlyProfiles: answers.monthlyProfiles,
    climateProfile: answers.climateProfile,
    climateProfileId: answers.climateProfileId,
    solarOrientation: answers.buildingSpecificParameters?.windowOrientation,
    mainOrientation: answers.buildingSpecificParameters?.mainOrientation,
    allowSyntheticClimate: answers.allowSyntheticClimate === true ||
      answers.source?.origin === "demo_fixture"
  });
  if (monthlySelection.status !== "ready") {
    return blocked(monthlySelection.code ?? "building_dna_missing_climate_profile");
  }
  return resolveBuildingDna({
    userMode: ASSISTED_MODE,
    source: answers.source ?? { reference: "P1.assisted_answers" },
    typologyProposal: typology.proposal,
    geometry: defaultGeometry({
      ...geometryOverridesFromBuildingSpecificParameters(answers.buildingSpecificParameters ?? {}),
      ...(answers.geometry ?? {})
    }),
    buildingSpecificParameters: answers.buildingSpecificParameters,
    renovationInterventions: interventions.interventions,
    boundaryContext: {
      ...boundaryContextFromAssistedContext(answers.context ?? {}),
      ...(answers.boundaryContext ?? {})
    },
    climateProfile: monthlySelection.climateProfile,
    calculationMode: monthlySelection.calculationMode,
    monthlyProfiles: monthlySelection.monthlyProfiles,
    building: {
      buildingId: answers.buildingId,
      buildingType: answers.buildingType,
      constructionPeriod: answers.constructionPeriod,
      structuralSystem: answers.structuralSystem,
      location: answers.location ?? null
    }
  });
}

export function createBuildingDnaFromAdvancedModel(input = {}) {
  const monthlySelection = resolveMonthlyProfileSelection({
    monthlyProfiles: input.monthlyProfiles,
    climateProfile: input.climateProfile,
    climateProfileId: input.climateProfileId,
    solarOrientation: input.buildingSpecificParameters?.windowOrientation,
    mainOrientation: input.buildingSpecificParameters?.mainOrientation,
    allowSyntheticClimate: input.allowSyntheticClimate === true
  });
  if (monthlySelection.status !== "ready") {
    return blocked(monthlySelection.code ?? "building_dna_missing_climate_profile");
  }
  return resolveBuildingDna({
    userMode: ADVANCED_MODE,
    source: input.source ?? { reference: "P1.advanced_model" },
    assemblySelections: input.assemblySelections,
    geometry: input.geometry,
    buildingSpecificParameters: input.buildingSpecificParameters,
    renovationInterventions: input.renovationInterventions,
    boundaryContext: input.boundaryContext,
    climateProfile: monthlySelection.climateProfile,
    calculationMode: monthlySelection.calculationMode,
    monthlyProfiles: monthlySelection.monthlyProfiles,
    building: input.building
  });
}

export function createP1SeedGeometry(overrides = {}) {
  return defaultGeometry(overrides);
}

export function createP1SeedBoundaryContext(overrides = {}) {
  return { ...seedBoundaryContext(), ...deepClone(overrides) };
}

export function applyBuildingDnaOverride(buildingDna, override) {
  const next = deepClone(buildingDna);
  if (override?.kind !== "assembly_layer_thickness") {
    return {
      status: "blocked",
      code: "unsupported_building_dna_override_kind",
      buildingDna: null
    };
  }
  const assembly = next.assemblies.find(item => item.assemblyId === override.assemblyId);
  const layer = assembly?.layers.find(item => item.layerId === override.layerId);
  if (!layer || !finitePositive(override.thicknessM) || !safeCode(override.reason, 160)) {
    return {
      status: "blocked",
      code: "invalid_building_dna_override",
      buildingDna: null
    };
  }
  const previousValue = deepClone(layer.thickness);
  layer.thickness = q(
    override.thicknessM,
    "m",
    override.source?.reference ?? `P1.override.${assembly.assemblyId}.${layer.layerId}.thickness`,
    "high",
    "engineering_override"
  );
  layer.provenance = layer.thickness.provenance;
  const overrideRecord = {
    overrideId: override.overrideId ?? `override.${Date.now()}`,
    kind: override.kind,
    target: {
      assemblyId: assembly.assemblyId,
      layerId: layer.layerId,
      field: "thickness"
    },
    previousValue,
    newValue: deepClone(layer.thickness),
    reason: override.reason,
    provenance: layer.thickness.provenance
  };
  next.overrides.push(overrideRecord);
  return {
    status: "ready",
    buildingDna: next,
    override: overrideRecord
  };
}

export function getBuildingDnaDependencyTree(buildingDna, target) {
  const dna = deepClone(buildingDna);
  const nodes = [];
  if (target === "Htr" || target === "annualQHnd" || target === "annualQCnd") {
    nodes.push({
      nodeId: "building.envelope.assemblies",
      label: "Envelope assemblies",
      inputs: dna.assemblies.map(assembly => ({
        assemblyId: assembly.assemblyId,
        role: assembly.assemblyRole,
        provenance: assembly.provenance
      }))
    });
    nodes.push({
      nodeId: "building.envelope.boundaries",
      label: "Boundary conditions",
      inputs: dna.envelopeElements.map(element => ({
        elementId: element.elementId,
        boundaryType: element.boundaryType
      }))
    });
  }
  if (target === "annualQHnd" || target === "annualQCnd") {
    nodes.push({
      nodeId: "building.monthly_profiles",
      label: "Monthly climate, ventilation, and gains profiles",
      inputs: dna.monthlyProfiles.map(profile => ({
        month: profile.month,
        provenance: profile.provenance
      }))
    });
  }
  return {
    status: "ready",
    target,
    physicsAuthority: "Chapter 2 physics engine",
    formulaReferences: [
      "MC001_R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK",
      "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX"
    ],
    nodes,
    assumptions: dna.assumptions,
    overrides: dna.overrides
  };
}
