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
  CALENDAR_MONTHLY_HOURS,
  MONTH_IDS,
  climateProfileToBuildingMonthlyProfiles,
  evaluateClimateCalculationEligibility,
  getClimateZoneDependentRequirements,
  getWinterDesignTemperatureByClimateZone,
  resolveRomanianNormativeClimateSelection,
  resolveRomanianLocationClimate,
  resolveClimateProfileSelection,
  resolveRomanianProductionClimateProfile
} from "../climate-platform/index.mjs";
import {
  TECHNICAL_SYSTEMS_SCHEMA,
  validateTechnicalSystems
} from "./buildingChapter3InstallationsAdapter.mjs";
import { deriveMc001MonthlyInternalGainsFromTable2_15 } from "../physics-engine/mc001InternalGainsCalculation.mjs";

const ASSISTED_MODE = "assisted";
const ADVANCED_MODE = "advanced";
const RESOLVER_SCOPE = "building_dna_v1_engineering_model_no_physics_calculation";
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compactClimateProviderResult(climateProviderResult) {
  if (!climateProviderResult) return null;
  const monthlyTemperature = climateProviderResult.datasets?.monthlyExteriorTemperature ?? null;
  const monthlyHumidity = climateProviderResult.datasets?.monthlyRelativeHumidity ?? null;
  const winterDesign = climateProviderResult.datasets?.winterDesignDayTemperature ?? null;
  const summerDesign = climateProviderResult.datasets?.summerDesignDayTemperature ?? null;
  const monthlyHsol = climateProviderResult.datasets?.monthlyHsolVerticalHorizontal ?? null;
  return {
    providerVersion: climateProviderResult.providerVersion ?? null,
    datasetVersion: climateProviderResult.datasetVersion ?? null,
    datasetStatus: climateProviderResult.datasetStatus ?? null,
    sourceDocument: climateProviderResult.sourceDocument ?? null,
    selection: climateProviderResult.selection ?? null,
    datasets: {
      monthlyExteriorTemperature: monthlyTemperature ? {
        datasetId: monthlyTemperature.datasetId,
        datasetVersion: monthlyTemperature.datasetVersion,
        datasetStatus: monthlyTemperature.datasetStatus,
        sourceReference: monthlyTemperature.sourceReference,
        stationId: monthlyTemperature.stationId,
        stationName: monthlyTemperature.stationName,
        unit: monthlyTemperature.unit,
        monthlyRecords: monthlyTemperature.monthlyRecords,
        annualMeanExteriorTemperatureC: monthlyTemperature.annualMeanExteriorTemperatureC
      } : null,
      monthlyRelativeHumidity: monthlyHumidity ? {
        datasetId: monthlyHumidity.datasetId,
        datasetVersion: monthlyHumidity.datasetVersion,
        datasetStatus: monthlyHumidity.datasetStatus,
        sourceReference: monthlyHumidity.sourceReference,
        stationId: monthlyHumidity.stationId,
        stationName: monthlyHumidity.stationName,
        unit: monthlyHumidity.unit,
        monthlyRecords: monthlyHumidity.monthlyRecords,
        annualMeanRelativeHumidityPct: monthlyHumidity.annualMeanRelativeHumidityPct
      } : null,
      winterDesignDayTemperature: winterDesign ? {
        datasetId: winterDesign.datasetId,
        datasetVersion: winterDesign.datasetVersion,
        datasetStatus: winterDesign.datasetStatus,
        sourceReference: winterDesign.sourceReference,
        stationId: winterDesign.stationId,
        stationName: winterDesign.stationName,
        unit: winterDesign.unit,
        meanDailyTemperatureC: winterDesign.meanDailyTemperatureC
      } : null,
      summerDesignDayTemperature: summerDesign ? {
        datasetId: summerDesign.datasetId,
        datasetVersion: summerDesign.datasetVersion,
        datasetStatus: summerDesign.datasetStatus,
        sourceReference: summerDesign.sourceReference,
        stationId: summerDesign.stationId,
        stationName: summerDesign.stationName,
        unit: summerDesign.unit,
        meanDailyTemperatureC: summerDesign.meanDailyTemperatureC
      } : null,
      monthlySolarIrradiation: climateProviderResult.datasets?.monthlySolarIrradiation ?? null,
      monthlyHsolVerticalHorizontal: monthlyHsol ? {
        datasetId: monthlyHsol.datasetId,
        datasetVersion: monthlyHsol.datasetVersion,
        datasetStatus: monthlyHsol.datasetStatus,
        sourceReference: monthlyHsol.sourceReference,
        stationId: monthlyHsol.stationId,
        stationName: monthlyHsol.stationName,
        solarStationId: monthlyHsol.solarStationId,
        climateStationId: monthlyHsol.climateStationId,
        unit: monthlyHsol.unit,
        valueType: monthlyHsol.valueType,
        temporalResolution: monthlyHsol.temporalResolution,
        supportedOrientations: monthlyHsol.supportedOrientations,
        preprocessingStatus: monthlyHsol.preprocessingStatus,
        monthlyRecords: monthlyHsol.monthlyRecords
      } : null,
      degreeDays: climateProviderResult.datasets?.degreeDays ?? null
    },
    diagnostics: climateProviderResult.diagnostics ?? []
  };
}

function resolveCanonicalClimateProviderResult(locationClimate, suppliedProviderResult, source = {}) {
  if (suppliedProviderResult) return suppliedProviderResult;
  const location = locationClimate?.location ?? {};
  const climate = locationClimate?.climate ?? {};
  const stationId = source?.climateStationId ??
    source?.stationId ??
    location.stationId ??
    climate.stationId ??
    null;
  const localityId = source?.localityId ?? location.localityId ?? null;
  const localityName = source?.localityName ??
    location.localityName ??
    location.city ??
    null;
  if (!stationId && !localityId && !localityName) return null;
  return resolveRomanianNormativeClimateSelection({
    stationId,
    localityId,
    localityName,
    climateZone: climate.climateZone ?? null,
    windZone: climate.windZone ?? null,
    manualOverride: climate.manualOverride === true,
    overrideReason: climate.overrideReason ?? null
  });
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

function normalizeTechnicalSystems(technicalSystems) {
  if (technicalSystems === undefined || technicalSystems === null) return null;
  return {
    ...deepClone(technicalSystems),
    schema: technicalSystems.schema ?? TECHNICAL_SYSTEMS_SCHEMA
  };
}

function resolveLocationClimate(location = {}, climate = {}) {
  return resolveRomanianLocationClimate({
    country: location.country ?? climate.country ?? "RO",
    countyCode: location.countyCode ?? climate.countyCode ?? null,
    countyName: location.countyName ?? location.county ?? climate.countyName ?? null,
    localityId: location.localityId ?? climate.localityId ?? null,
    localityName: location.localityName ?? location.locality ?? location.city ?? climate.localityName ?? null,
    climateZone: climate.climateZone ?? location.climateZone ?? null,
    windZone: climate.windZone ?? location.windZone ?? null,
    manualOverride: climate.manualOverride === true || location.manualOverride === true,
    overrideReason: climate.overrideReason ?? location.overrideReason ?? null
  });
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

function deriveVentilationAirFlowRateM3PerS(parameters = {}) {
  const ach = parameters.ventilationAch;
  const heatedVolume = parameters.heatedVolumeM3;
  if (!finitePositive(ach) || !finitePositive(heatedVolume)) {
    return null;
  }
  return (ach * heatedVolume) / 3600;
}

function monthlyProfilesWithGeometryVentilation(monthlyProfiles = [], parameters = {}, source = {}) {
  const airFlowRate = deriveVentilationAirFlowRateM3PerS(parameters);
  if (airFlowRate === null) {
    return monthlyProfiles;
  }
  return monthlyProfiles.map(profile => ({
    ...profile,
    ventilationAirFlowRateM3PerS: airFlowRate,
    provenance: {
      ...(profile.provenance ?? {}),
      ventilationAirflowSource: "ach_and_heated_volume",
      ventilationAch: parameters.ventilationAch,
      heatedVolumeM3: parameters.heatedVolumeM3,
      reference: source.reference ?? profile.provenance?.reference ?? "P3F.geometry.ventilation_airflow",
      confidence: source.confidence ?? profile.provenance?.confidence ?? "medium"
    }
  }));
}

function monthlyProfilesWithProviderClimate(monthlyProfiles = [], climateProviderResult, source = {}) {
  const temperatureRecords =
    climateProviderResult?.datasets?.monthlyExteriorTemperature?.monthlyRecords ?? [];
  if (temperatureRecords.length !== MONTH_IDS.length) return monthlyProfiles;
  const byMonth = new Map(temperatureRecords.map(record => [record.month, record]));
  return monthlyProfiles.map(profile => {
    const temperature = byMonth.get(profile.month);
    if (!temperature) return profile;
    return {
      ...profile,
      heatingOutdoorTemperatureC: temperature.value,
      provenance: {
        ...(profile.provenance ?? {}),
        monthlyExteriorTemperatureSource: "mc001_6_2013_provider",
        monthlyExteriorTemperatureStationId: climateProviderResult.selection?.stationId ?? null,
        monthlyExteriorTemperatureDatasetVersion:
          climateProviderResult.datasets?.monthlyExteriorTemperature?.datasetVersion ??
          climateProviderResult.datasetVersion ??
          null,
        monthlyExteriorTemperatureSourceReference:
          climateProviderResult.datasets?.monthlyExteriorTemperature?.sourceReference ?? null,
        reference:
          source.reference ??
          profile.provenance?.reference ??
          "P5C.climate_provider.monthly_exterior_temperature",
        confidence: source.confidence ?? profile.provenance?.confidence ?? "high"
      }
    };
  });
}

const INTERNAL_GAINS_CATEGORY_ALIASES = Object.freeze({
  residential_collective: "residential_collective",
  collective_residential: "residential_collective",
  apartment: "residential_collective",
  apartment_building: "residential_collective",
  multifamily_residential: "residential_collective",
  residential_single_family: "residential_single_family",
  detached_house: "residential_single_family",
  house: "residential_single_family",
  single_family_house: "residential_single_family",
  administrative: "administrative",
  office: "administrative",
  office_building: "administrative",
  administrative_building: "administrative",
  schools: "schools",
  school: "schools",
  educational_building: "schools",
  hospitals: "hospitals",
  hospital: "hospitals",
  healthcare_building: "hospitals"
});

function internalGainsCategoryIdForBuildingUse({
  buildingType,
  useCategory,
  internalGainsCategoryId
} = {}) {
  for (const value of [internalGainsCategoryId, useCategory, buildingType]) {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (INTERNAL_GAINS_CATEGORY_ALIASES[normalized]) {
        return INTERNAL_GAINS_CATEGORY_ALIASES[normalized];
      }
    }
  }
  return null;
}

function monthlyInternalGainsFromTable2_15({
  buildingType,
  useCategory,
  internalGainsCategoryId,
  usefulFloorAreaM2,
  durationHours,
  month,
  source = {}
} = {}) {
  const categoryId = internalGainsCategoryIdForBuildingUse({
    buildingType,
    useCategory,
    internalGainsCategoryId
  });
  if (!categoryId || !finitePositive(usefulFloorAreaM2)) {
    return {
      amount: 0,
      source: "internal_gains_table_2_15_category_or_area_missing",
      categoryId: null,
      constantInternalGainWPerM2: null,
      productionEligible: false,
      blockerCode: "INTERNAL_GAINS_TABLE_2_15_CATEGORY_AND_AREA_REQUIRED"
    };
  }
  const result = deriveMc001MonthlyInternalGainsFromTable2_15({
    mode: "monthly_internal_gains_table_2_15_v1",
    cases: [
      {
        caseId: `${month}.internal_gains_table_2_15`,
        month,
        categoryId,
        usefulFloorAreaM2,
        durationHours,
        source: {
          reference: source.reference ?? "P7E.internal_gains.table_2_15",
          notes: source.notes
        }
      }
    ]
  });
  if (result.status !== "ready" || result.caseResults.length !== 1) {
    return {
      amount: 0,
      source: "internal_gains_table_2_15_category_or_area_missing",
      categoryId,
      constantInternalGainWPerM2: null,
      productionEligible: false,
      blockerCode: result.diagnostics?.blockers?.[0]?.code ??
        "INTERNAL_GAINS_TABLE_2_15_CATEGORY_AND_AREA_REQUIRED"
    };
  }
  const row = result.caseResults[0];
  return {
    amount: row.internalGainsKwh,
    source: "mc001_table_2_15_category_area_duration",
    categoryId,
    categoryRo: row.categoryRo,
    constantInternalGainWPerM2: row.constantInternalGainWPerM2,
    sourceTable: row.sourceTable,
    sourceSection: row.sourceSection,
    sourcePage: row.sourcePage,
    formulaCode: row.formulaCode,
    scope: row.scope,
    executionTrace: row.executionTrace,
    productionEligible: true
  };
}

function monthlyProfilesFromProviderClimate(climateProviderResult, source = {}, context = {}) {
  const temperatureDataset = climateProviderResult?.datasets?.monthlyExteriorTemperature;
  const temperatureRecords = temperatureDataset?.monthlyRecords ?? [];
  if (temperatureRecords.length !== MONTH_IDS.length) return null;
  const byMonth = new Map(temperatureRecords.map(record => [record.month, record]));
  const stationId = climateProviderResult?.selection?.stationId ?? null;
  const localityId = climateProviderResult?.selection?.localityId ?? null;
  const localityName = climateProviderResult?.selection?.localityName ?? null;
  const datasetVersion = temperatureDataset?.datasetVersion ??
    climateProviderResult?.datasetVersion ??
    null;
  const monthlyProfiles = MONTH_IDS.map(month => {
    const record = byMonth.get(month);
    if (!record || typeof record.value !== "number" || !Number.isFinite(record.value)) {
      return null;
    }
    const durationHours = CALENDAR_MONTHLY_HOURS[month];
    const internalGains = monthlyInternalGainsFromTable2_15({
      buildingType: context.buildingType,
      useCategory: context.useCategory,
      internalGainsCategoryId: context.internalGainsCategoryId,
      usefulFloorAreaM2: context.usefulFloorAreaM2,
      durationHours,
      month,
      source
    });
    return {
      month,
      heatingIndoorTemperatureC: 20,
      heatingOutdoorTemperatureC: record.value,
      coolingIndoorTemperatureC: 24,
      coolingOutdoorTemperatureC: record.value,
      durationHours,
      ventilationAirHeatCapacityJPerM3K: 1200,
      ventilationAirFlowRateM3PerS: 0,
      internalGainsKwh: internalGains.amount,
      solarGainsKwh: 0,
      solarOrientation: null,
      solarGainsSource: "provider_climate_profile_without_qsol_preprocessing",
      internalGainsSource: internalGains.source,
      provenance: {
        origin: "selected_from_mc001_catalogue",
        reference:
          source.reference ??
          "P5C.climate_provider.generated_monthly_profile_from_mc001_6_2013",
        confidence: "high",
        sourceOrigin: "source_backed_romanian_climate_provider",
        monthlyDataSource: "mc001_6_2013_monthly_exterior_temperature",
        monthlyExteriorTemperatureSource: "mc001_6_2013_provider",
        monthlyExteriorTemperatureStationId: stationId,
        monthlyExteriorTemperatureDatasetVersion: datasetVersion,
        monthlyExteriorTemperatureSourceReference: temperatureDataset?.sourceReference ?? null,
        localityId,
        localityName,
        stationId,
        internalGainsSource: internalGains.source,
        internalGainsCategoryId: internalGains.categoryId,
        internalGainsCategoryRo: internalGains.categoryRo ?? null,
        internalGainsConstantWPerM2: internalGains.constantInternalGainWPerM2,
        internalGainsSourceTable: internalGains.sourceTable ?? null,
        internalGainsSourceSection: internalGains.sourceSection ?? null,
        internalGainsSourcePage: internalGains.sourcePage ?? null,
        internalGainsFormulaCode: internalGains.formulaCode ?? null,
        internalGainsExecutionTrace: internalGains.executionTrace ?? null,
        internalGainsProductionEligible: internalGains.productionEligible === true,
        internalGainsBlockerCode: internalGains.blockerCode ?? null,
        solarGainsSource: "provider_climate_profile_without_qsol_preprocessing",
        notes:
          "Temperaturile lunare sunt rezolvate din providerul climatic normativ. Aporturile interne sunt calculate din Tabelul 2.15 numai cand categoria de utilizare si aria utila sunt explicite. Hsol este disponibil din A.9.6 pentru planurile verticale/orizontale tabelate, dar aporturile solare Qsol raman neexecutate pana cand Qsky si inputurile complete ale elementelor solare sunt furnizate sau certificate."
      }
    };
  });
  if (monthlyProfiles.some(profile => profile === null)) return null;
  return monthlyProfiles;
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
  climateProviderResult,
  monthlyProfileContext,
  solarOrientation,
  mainOrientation,
  source
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
  if (!climateProfile && !climateProfileId) {
    const providerMonthlyProfiles = monthlyProfilesFromProviderClimate(
      climateProviderResult,
      source,
      monthlyProfileContext
    );
    if (providerMonthlyProfiles !== null) {
      return {
        status: "ready",
        monthlyProfiles: providerMonthlyProfiles,
        climateProfile: null,
        calculationMode: "source_backed_romanian_climate_provider"
      };
    }
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
  for (const [index, profile] of monthlyProfiles.entries()) {
    if (!MONTH_IDS.includes(profile.month) || seen.has(profile.month)) {
      return { ok: false, code: "missing_or_invalid_monthly_building_profile" };
    }
    if (profile.month !== MONTH_IDS[index]) {
      return { ok: false, code: "monthly_building_profile_month_order_mismatch" };
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
        ...(source.internalGainsSource === undefined ? {} : { internalGainsSource: source.internalGainsSource }),
        ...(source.internalGainsCategoryId === undefined ? {} : { internalGainsCategoryId: source.internalGainsCategoryId }),
        ...(source.internalGainsCategoryRo === undefined ? {} : { internalGainsCategoryRo: source.internalGainsCategoryRo }),
        ...(source.internalGainsConstantWPerM2 === undefined ? {} : { internalGainsConstantWPerM2: source.internalGainsConstantWPerM2 }),
        ...(source.internalGainsFormulaCode === undefined ? {} : { internalGainsFormulaCode: source.internalGainsFormulaCode }),
        ...(source.internalGainsSourceTable === undefined ? {} : { internalGainsSourceTable: source.internalGainsSourceTable }),
        ...(source.internalGainsSourceSection === undefined ? {} : { internalGainsSourceSection: source.internalGainsSourceSection }),
        ...(source.internalGainsSourcePage === undefined ? {} : { internalGainsSourcePage: source.internalGainsSourcePage }),
        ...(source.internalGainsProductionEligible === undefined ? {} : { internalGainsProductionEligible: source.internalGainsProductionEligible }),
        ...(source.internalGainsBlockerCode === undefined ? {} : { internalGainsBlockerCode: source.internalGainsBlockerCode }),
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
          ...(profile.provenance.internalGainsSource === undefined ? {} : { internalGainsSource: profile.provenance.internalGainsSource }),
          ...(profile.provenance.internalGainsCategoryId === undefined ? {} : { internalGainsCategoryId: profile.provenance.internalGainsCategoryId }),
          ...(profile.provenance.internalGainsCategoryRo === undefined ? {} : { internalGainsCategoryRo: profile.provenance.internalGainsCategoryRo }),
          ...(profile.provenance.internalGainsConstantWPerM2 === undefined ? {} : { internalGainsConstantWPerM2: profile.provenance.internalGainsConstantWPerM2 }),
          ...(profile.provenance.internalGainsFormulaCode === undefined ? {} : { internalGainsFormulaCode: profile.provenance.internalGainsFormulaCode }),
          ...(profile.provenance.internalGainsSourceTable === undefined ? {} : { internalGainsSourceTable: profile.provenance.internalGainsSourceTable }),
          ...(profile.provenance.internalGainsSourceSection === undefined ? {} : { internalGainsSourceSection: profile.provenance.internalGainsSourceSection }),
          ...(profile.provenance.internalGainsSourcePage === undefined ? {} : { internalGainsSourcePage: profile.provenance.internalGainsSourcePage }),
          ...(profile.provenance.internalGainsProductionEligible === undefined ? {} : { internalGainsProductionEligible: profile.provenance.internalGainsProductionEligible }),
          ...(profile.provenance.internalGainsBlockerCode === undefined ? {} : { internalGainsBlockerCode: profile.provenance.internalGainsBlockerCode }),
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
      internalGainsSource: profile.provenance?.internalGainsSource ?? profile.internalGainsSource ?? null,
      internalGainsCategoryId: profile.provenance?.internalGainsCategoryId ?? profile.internalGainsCategoryId ?? null,
      internalGainsCategoryRo: profile.provenance?.internalGainsCategoryRo ?? profile.internalGainsCategoryRo ?? null,
      internalGainsConstantWPerM2:
        profile.provenance?.internalGainsConstantWPerM2 ??
        profile.internalGainsConstantWPerM2 ??
        null,
      internalGainsFormulaCode:
        profile.provenance?.internalGainsFormulaCode ??
        profile.internalGainsFormulaCode ??
        null,
      internalGainsSourceTable:
        profile.provenance?.internalGainsSourceTable ??
        profile.internalGainsSourceTable ??
        null,
      internalGainsSourceSection:
        profile.provenance?.internalGainsSourceSection ??
        profile.internalGainsSourceSection ??
        null,
      internalGainsSourcePage:
        profile.provenance?.internalGainsSourcePage ??
        profile.internalGainsSourcePage ??
        null,
      internalGainsProductionEligible:
        profile.provenance?.internalGainsProductionEligible ??
        profile.internalGainsProductionEligible ??
        null,
      internalGainsBlockerCode:
        profile.provenance?.internalGainsBlockerCode ??
        profile.internalGainsBlockerCode ??
        null,
      internalGainsExecutionTrace:
        profile.provenance?.internalGainsExecutionTrace ??
        profile.internalGainsExecutionTrace ??
        null,
      solarOrientation: profile.solarOrientation ?? null,
      solarGainsSource: profile.solarGainsSource ?? "monthly_profile_solar_gains",
      adjacentUnconditionedZones:
        profile.heatGains?.adjacentUnconditionedZones ??
        profile.adjacentUnconditionedZones ??
        null
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
  climateProviderResult,
  technicalSystems,
  building,
  locationClimate
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
  const technicalSystemsCheck = validateTechnicalSystems(technicalSystems);
  if (!technicalSystemsCheck.ok) {
    return blocked(
      technicalSystemsCheck.diagnostics?.[0]?.code ?? "invalid_technical_systems_model"
    );
  }

  const resolvedBoundaryContext = {
    ...seedBoundaryContext(),
    ...(boundaryContext ?? {})
  };
  const normalizedTechnicalSystems = normalizeTechnicalSystems(technicalSystems);
  const canonicalClimateProviderResult = resolveCanonicalClimateProviderResult(
    locationClimate,
    climateProviderResult,
    {
      climateStationId: building?.location?.climateStationId ?? building?.location?.stationId,
      stationId: building?.location?.stationId,
      localityId: building?.location?.localityId,
      localityName: building?.location?.localityName ?? building?.location?.city
    }
  );
  const productionClimateProfile = canonicalClimateProviderResult
    ? resolveRomanianProductionClimateProfile({
        localityId: canonicalClimateProviderResult.selection?.localityId ?? locationClimate?.location?.localityId ?? null,
        localityName: canonicalClimateProviderResult.selection?.localityName ?? locationClimate?.location?.localityName ?? locationClimate?.location?.city ?? null,
        stationId: canonicalClimateProviderResult.selection?.stationId ?? building?.location?.climateStationId ?? building?.location?.stationId ?? null,
        climateZone: canonicalClimateProviderResult.selection?.climateZone ?? locationClimate?.climate?.climateZone ?? null,
        windZone: canonicalClimateProviderResult.selection?.windZone ?? locationClimate?.climate?.windZone ?? null,
        manualOverride: locationClimate?.climate?.manualOverride === true,
        overrideReason: locationClimate?.climate?.overrideReason ?? null
      })
    : null;
  const climateRequirements = locationClimate?.climate?.climateZone
    ? getClimateZoneDependentRequirements({
        climateZone: locationClimate.climate.climateZone,
        buildingUse: building?.buildingType === "non_residential" ? "non_residential" : "residential"
      })
    : null;
  const winterDesignTemperature = locationClimate?.climate?.climateZone
    ? getWinterDesignTemperatureByClimateZone(locationClimate.climate.climateZone)
    : null;
  const climateEligibility = evaluateClimateCalculationEligibility({
    climate: locationClimate?.climate ?? {},
    climateProfile,
    monthlyProfiles,
    climateProviderResult: canonicalClimateProviderResult
  });
  const methodologyLimits = [
    "engineering_model_generation_only",
    "no_physics_calculation",
    "no_hidden_defaults",
    ...(normalizedTechnicalSystems ? [] : ["not_chapter_3"]),
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate"
  ];
  const dna = {
    schema: "building_dna_v1",
    platformVersion: BUILDING_PLATFORM_VERSION,
    scope: RESOLVER_SCOPE,
    userMode,
    source,
    building: {
      buildingId: building?.buildingId ?? "building-dna-p1",
      buildingType: building?.buildingType ?? typologyProposal?.buildingType ?? "detached_house",
      ...(building?.useCategory === undefined ? {} : { useCategory: building.useCategory }),
      ...(building?.internalGainsCategoryId === undefined
        ? {}
        : { internalGainsCategoryId: building.internalGainsCategoryId }),
      constructionPeriod: building?.constructionPeriod ?? typologyProposal?.constructionPeriod,
      structuralSystem: building?.structuralSystem ?? typologyProposal?.structuralSystem,
      location: {
        ...(building?.location ?? {}),
        ...(locationClimate?.location ?? {}),
        climateZone: locationClimate?.climate?.climateZone ?? building?.location?.climateZone ?? null,
        windZone: locationClimate?.climate?.windZone ?? building?.location?.windZone ?? null,
        climateStationId: canonicalClimateProviderResult?.selection?.stationId ?? building?.location?.climateStationId ?? null,
        climateAssignmentOrigin: locationClimate?.climate?.assignmentOrigin ?? null,
        climateDatasetId: locationClimate?.climate?.datasetId ?? null,
        climateDatasetVersion: locationClimate?.climate?.datasetVersion ?? null
      }
    },
    climate: locationClimate?.climate ?? null,
    ...(canonicalClimateProviderResult ? { climateProvider: compactClimateProviderResult(canonicalClimateProviderResult) } : {}),
    ...(productionClimateProfile ? { productionClimateProfile } : {}),
    climateZoneRequirements: climateRequirements?.status === "ready" ? {
      climateZone: climateRequirements.climateZone,
      solarFactor: climateRequirements.solarFactor,
      nzebLimit: climateRequirements.nzebLimit,
      renovationLimit: climateRequirements.renovationLimit,
      winterDesignTemperature: winterDesignTemperature?.status === "ready"
        ? winterDesignTemperature
        : null
    } : null,
    climateEligibility,
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
      datasetStatus: climateProfile.datasetStatus ?? null,
      verificationStatus: climateProfile.verificationStatus,
      datasetVersion: climateProfile.datasetVersion,
      sourceTitle: climateProfile.sourceTitle ?? null,
      sourceAuthority: climateProfile.sourceAuthority ?? null,
      sourceEdition: climateProfile.sourceEdition ?? null,
      stationId: climateProfile.stationId ?? null,
      stationName: climateProfile.stationName ?? null,
      checksum: climateProfile.checksum ?? null,
      sourceReferences: climateProfile.sourceReferences,
      safetyLabel: climateProfile.safetyLabel ?? null
    },
    calculationStatus: calculationMode === "synthetic_demo"
      ? "synthetic_demo"
      : calculationMode === "explicit_professional_climate_profile"
        ? "estimated"
        : calculationMode === "source_backed_romanian_climate_provider"
          ? "source_backed_climate_provider"
          : "requires_confirmation",
    typologyProposal: typologyProposal ?? null,
    buildingSpecificParameters: normalizeBuildingSpecificParameters(buildingSpecificParameters, source),
    ...(normalizedTechnicalSystems === null ? {} : { technicalSystems: normalizedTechnicalSystems }),
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
      warning("building_dna_contains_unconfirmed_typology_proposals"),
      ...(calculationMode === "source_backed_romanian_climate_provider" ? [
        warning("source_backed_monthly_temperature_from_climate_provider"),
        warning("solar_gains_qsky_and_complete_solar_element_inputs_required")
      ] : []),
      ...(locationClimate?.diagnostics ?? [])
        .filter(item => item.severity !== "blocking")
        .map(item => warning(item.code))
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
      methodologyLimits
    }
  };
  return {
    status: "ready",
    scope: RESOLVER_SCOPE,
    buildingDna: dna,
    diagnostics: {
      blockers: [],
      warnings: dna.warnings,
      methodologyLimits
    }
  };
}

export function createBuildingDnaFromAssistedAnswers(answers = {}) {
  const assistedGeometry = defaultGeometry({
    ...geometryOverridesFromBuildingSpecificParameters(answers.buildingSpecificParameters ?? {}),
    ...(answers.geometry ?? {})
  });
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
  const locationClimate = resolveLocationClimate(answers.location ?? {}, answers.climate ?? {});
  if (locationClimate.status !== "ready") {
    return blocked(locationClimate.diagnostics.find(item => item.severity === "blocking")?.code ?? "invalid_climate_location_selection");
  }
  const canonicalClimateProviderResult = resolveCanonicalClimateProviderResult(
    locationClimate,
    answers.climateProviderResult,
    {
      climateStationId: answers.location?.climateStationId ?? answers.location?.stationId,
      stationId: answers.location?.stationId,
      localityId: answers.location?.localityId,
      localityName: answers.location?.localityName ?? answers.location?.city
    }
  );
  const monthlySelection = resolveMonthlyProfileSelection({
    monthlyProfiles: answers.monthlyProfiles,
    climateProfile: answers.climateProfile,
    climateProfileId: answers.climateProfileId,
    climateProviderResult: canonicalClimateProviderResult,
    monthlyProfileContext: {
      buildingType: answers.buildingType,
      useCategory: answers.buildingUseCategory ?? answers.useCategory,
      internalGainsCategoryId: answers.internalGainsCategoryId,
      usefulFloorAreaM2: answers.buildingSpecificParameters?.usefulFloorAreaM2 ??
        assistedGeometry.usefulFloorAreaM2
    },
    solarOrientation: answers.buildingSpecificParameters?.windowOrientation,
    mainOrientation: answers.buildingSpecificParameters?.mainOrientation,
    allowSyntheticClimate: answers.allowSyntheticClimate === true ||
      answers.source?.origin === "demo_fixture",
    source: answers.source ?? { reference: "P1.assisted_answers" }
  });
  if (monthlySelection.status !== "ready") {
    return blocked(monthlySelection.code ?? "building_dna_missing_climate_profile");
  }
  const baseMonthlyProfiles = monthlyProfilesWithGeometryVentilation(
    monthlySelection.monthlyProfiles,
    answers.buildingSpecificParameters ?? {},
    answers.source ?? { reference: "P1.assisted_answers" }
  );
  const resolvedMonthlyProfiles = monthlySelection.calculationMode === "synthetic_demo"
    ? baseMonthlyProfiles
    : monthlyProfilesWithProviderClimate(
      baseMonthlyProfiles,
      canonicalClimateProviderResult,
      answers.source ?? { reference: "P1.assisted_answers" }
    );
  return resolveBuildingDna({
    userMode: ASSISTED_MODE,
    source: answers.source ?? { reference: "P1.assisted_answers" },
    typologyProposal: typology.proposal,
    geometry: assistedGeometry,
    buildingSpecificParameters: answers.buildingSpecificParameters,
    renovationInterventions: interventions.interventions,
    boundaryContext: {
      ...boundaryContextFromAssistedContext(answers.context ?? {}),
      ...(answers.boundaryContext ?? {})
    },
    climateProfile: monthlySelection.climateProfile,
    calculationMode: monthlySelection.calculationMode,
    monthlyProfiles: resolvedMonthlyProfiles,
    climateProviderResult: canonicalClimateProviderResult,
    technicalSystems: answers.technicalSystems,
    building: {
      buildingId: answers.buildingId,
      buildingType: answers.buildingType,
      useCategory: answers.buildingUseCategory ?? answers.useCategory ?? null,
      internalGainsCategoryId: answers.internalGainsCategoryId ?? null,
      constructionPeriod: answers.constructionPeriod,
      structuralSystem: answers.structuralSystem,
      location: answers.location ?? null
    },
    locationClimate
  });
}

export function createBuildingDnaFromAdvancedModel(input = {}) {
  const locationClimate = resolveLocationClimate(input.building?.location ?? input.location ?? {}, input.climate ?? {});
  if (locationClimate.status !== "ready") {
    return blocked(locationClimate.diagnostics.find(item => item.severity === "blocking")?.code ?? "invalid_climate_location_selection");
  }
  const canonicalClimateProviderResult = resolveCanonicalClimateProviderResult(
    locationClimate,
    input.climateProviderResult,
    {
      climateStationId: input.building?.location?.climateStationId ?? input.building?.location?.stationId ?? input.location?.climateStationId ?? input.location?.stationId,
      stationId: input.building?.location?.stationId ?? input.location?.stationId,
      localityId: input.building?.location?.localityId ?? input.location?.localityId,
      localityName: input.building?.location?.localityName ?? input.building?.location?.city ?? input.location?.localityName ?? input.location?.city
    }
  );
  const monthlySelection = resolveMonthlyProfileSelection({
    monthlyProfiles: input.monthlyProfiles,
    climateProfile: input.climateProfile,
    climateProfileId: input.climateProfileId,
    climateProviderResult: canonicalClimateProviderResult,
    monthlyProfileContext: {
      buildingType: input.building?.buildingType,
      useCategory: input.building?.useCategory ?? input.useCategory,
      internalGainsCategoryId:
        input.building?.internalGainsCategoryId ??
        input.internalGainsCategoryId,
      usefulFloorAreaM2: input.buildingSpecificParameters?.usefulFloorAreaM2 ??
        input.geometry?.usefulFloorAreaM2
    },
    solarOrientation: input.buildingSpecificParameters?.windowOrientation,
    mainOrientation: input.buildingSpecificParameters?.mainOrientation,
    allowSyntheticClimate: input.allowSyntheticClimate === true,
    source: input.source ?? { reference: "P1.advanced_model" }
  });
  if (monthlySelection.status !== "ready") {
    return blocked(monthlySelection.code ?? "building_dna_missing_climate_profile");
  }
  const baseMonthlyProfiles = monthlyProfilesWithGeometryVentilation(
    monthlySelection.monthlyProfiles,
    input.buildingSpecificParameters ?? {},
    input.source ?? { reference: "P1.advanced_model" }
  );
  const resolvedMonthlyProfiles = monthlySelection.calculationMode === "synthetic_demo"
    ? baseMonthlyProfiles
    : monthlyProfilesWithProviderClimate(
      baseMonthlyProfiles,
      canonicalClimateProviderResult,
      input.source ?? { reference: "P1.advanced_model" }
    );
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
    monthlyProfiles: resolvedMonthlyProfiles,
    climateProviderResult: canonicalClimateProviderResult,
    technicalSystems: input.technicalSystems,
    building: input.building,
    locationClimate
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
